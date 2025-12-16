export type ElementCallback = (el: Element) => void;

export interface WatchHandle {
  disconnect(): void; // 取消本次注册的回调
}

/**
 * DOMWatcher: 监听指定选择器的元素出现与销毁
 *
 * 用法示例：
 * const watcher = new DOMWatcher();
 * const handle = watcher.watch('.my-class', {
 *   onAdd: el => console.log('added', el),
 *   onRemove: el => console.log('removed', el),
 * });
 *
 * // 停止该 selector 的此回调
 * handle.disconnect();
 *
 * // 如果不再需要任何监听器，可运行
 * watcher.disconnectAll();
 */
export class DOMWatcher {
  private observer: MutationObserver;
  // selector -> array of {onAdd,onRemove, id}
  private listeners = new Map<
    string,
    Array<{ id: number; onAdd?: ElementCallback; onRemove?: ElementCallback }>
  >();
  // selector -> WeakSet of elements currently considered "present"
  private tracked = new Map<string, WeakSet<Element>>();
  private nextListenerId = 1;
  private connected = true;

  constructor(root: ParentNode = document.documentElement) {
    this.observer = new MutationObserver(records => this.handleMutations(records));
    // Observe subtree to catch additions/removals anywhere
    this.observer.observe(root, { childList: true, subtree: true });
    // also handle elements that already exist before watcher was created:
    // we'll trigger onAdd for existing elements when a listener is registered.
  }

  /**
   * 注册监听器
   * 返回一个 handle，用于取消该次注册
   */
  watch(
    selector: string,
    callbacks: { onAdd?: ElementCallback; onRemove?: ElementCallback }
  ): WatchHandle {
    if (!this.listeners.has(selector)) {
      this.listeners.set(selector, []);
      this.tracked.set(selector, new WeakSet<Element>());
    }
    const id = this.nextListenerId++;
    this.listeners.get(selector)!.push({ id, ...callbacks });

    // Immediately call onAdd for elements that already exist in the document
    if (callbacks.onAdd) {
      const elems = Array.from(document.querySelectorAll(selector));
      const set = this.tracked.get(selector)!;
      for (const el of elems) {
        // only call if not already tracked (to avoid double-calling)
        if (!set.has(el)) {
          set.add(el);
          try {
            callbacks.onAdd(el);
          } catch (err) {
            // swallow callback errors to not break observer
            console.error('DOMWatcher onAdd callback error:', err);
          }
        }
      }
    }

    return {
      disconnect: () => this.removeListener(selector, id),
    };
  }

  private removeListener(selector: string, id: number) {
    const arr = this.listeners.get(selector);
    if (!arr) return;
    const idx = arr.findIndex(x => x.id === id);
    if (idx !== -1) arr.splice(idx, 1);
    if (arr.length === 0) {
      this.listeners.delete(selector);
      this.tracked.delete(selector);
    }
  }

  private handleMutations(records: MutationRecord[]) {
    // process added and removed nodes
    for (const record of records) {
      // handle added nodes
      if (record.addedNodes && record.addedNodes.length) {
        for (const node of Array.from(record.addedNodes)) {
          this.processAddedNode(node);
        }
      }
      // handle removed nodes
      if (record.removedNodes && record.removedNodes.length) {
        for (const node of Array.from(record.removedNodes)) {
          this.processRemovedNode(node);
        }
      }
    }
  }

  private processAddedNode(node: Node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as Element;

    // For each selector, check if the element itself matches or contains matching descendants.
    for (const [selector, listeners] of this.listeners) {
      const set = this.tracked.get(selector)!;

      // if the added element itself matches
      if (el.matches(selector)) {
        if (!set.has(el)) {
          set.add(el);
          for (const l of listeners) {
            if (l.onAdd) {
              try {
                l.onAdd(el);
              } catch (err) {
                console.error('DOMWatcher onAdd callback error:', err);
              }
            }
          }
        }
      }

      // find descendant matches
      const descendants = Array.from(el.querySelectorAll(selector));
      for (const d of descendants) {
        if (!set.has(d)) {
          set.add(d);
          for (const l of listeners) {
            if (l.onAdd) {
              try {
                l.onAdd(d);
              } catch (err) {
                console.error('DOMWatcher onAdd callback error:', err);
              }
            }
          }
        }
      }
    }
  }

  private processRemovedNode(node: Node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as Element;

    // For each selector, check if the removed node itself or any removed descendant was tracked.
    for (const [selector, listeners] of this.listeners) {
      const set = this.tracked.get(selector)!;

      // If the removed element matched
      if (el.matches(selector)) {
        if (set.has(el)) {
          setDeleteAndNotify(set, el, listeners, 'onRemove');
        }
      }

      // For descendants
      const descendants = Array.from(el.querySelectorAll(selector));
      for (const d of descendants) {
        if (set.has(d)) {
          setDeleteAndNotify(set, d, listeners, 'onRemove');
        }
      }
    }
  }

  /**
   * 停止所有监听并断开 MutationObserver
   */
  disconnectAll() {
    if (!this.connected) return;
    this.observer.disconnect();
    this.listeners.clear();
    this.tracked.clear();
    this.connected = false;
  }
}

/** helper: delete from weakset requires checking via has then remove by not possible to explicitly delete from WeakSet in JS,
    but WeakSet does have delete, so use it. */
function setDeleteAndNotify(
  set: WeakSet<Element>,
  el: Element,
  listeners: Array<{ onAdd?: ElementCallback; onRemove?: ElementCallback }>,
  method: 'onAdd' | 'onRemove'
) {
  try {
    // notify listeners
    for (const l of listeners) {
      const cb = method === 'onRemove' ? l.onRemove : l.onAdd;
      if (cb) {
        try {
          cb(el);
        } catch (err) {
          console.error('DOMWatcher callback error:', err);
        }
      }
    }
  } finally {
    // remove element from tracked set
    // WeakSet has delete in browsers/Node DOM implementations
    try {
      (set as any).delete(el);
    } catch {
      // ignore if not supported (very unlikely)
    }
  }
}
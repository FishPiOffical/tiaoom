import type { Ref } from 'vue';
import { ref, watch, unref, onUnmounted } from 'vue';
import { useThrottleFn, useDebounceFn } from '@vueuse/core';

export type RemoveEventFn = () => void;
export interface UseEventParams {
  el?: Element | Ref<Element | undefined> | Window | any;
  name: string;
  listener: EventListener;
  options?: boolean | AddEventListenerOptions;
  debounce?: boolean;
  wait?: number;
}
export function useEventListener({
  el = window,
  name,
  listener,
  options,
  debounce = true,
  wait = 0,
}: UseEventParams): RemoveEventFn {
  /* eslint-disable-next-line */
  let dispose: RemoveEventFn = () => {};
  const isAddRef = ref(false);

  if (el) {
    const element = ref(el as Element) as Ref<Element>;

    const handler = debounce ? useDebounceFn(listener, wait) : useThrottleFn(listener, wait);
    const realHandler = wait ? handler : listener;

    const removeEventListener = (e: Element) => {
      isAddRef.value = true;
      e.removeEventListener(name, realHandler, options);
    };

    const addEventListener = (e: Element) => e.addEventListener(name, realHandler, options);

    const removeWatch = watch(
      element,
      (v, _ov, cleanUp) => {
        if (v) {
          !unref(isAddRef) && addEventListener(v);
          cleanUp(() => removeEventListener(v));
        }
      },
      { immediate: true },
    );

    dispose = () => {
      removeEventListener(element.value);
      removeWatch();
    };

    onUnmounted(() => dispose());
  }

  return dispose;
}

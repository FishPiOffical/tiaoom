export const isServer = typeof window === 'undefined';
export const isClient = !isServer;

export const toString = Object.prototype.toString;
export const assign = Object.assign;
export const hasOwn = (obj: Object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(obj, key);

export function getType(obj: any): string {
  if (obj instanceof Element) return 'Element';

  return toString.call(obj).slice(8, -1);
}

export function is(val: unknown, type: string) {
  return toString.call(val) === `[object ${type}]`;
}

export function isDef<T = unknown>(val?: T): val is T {
  return typeof val !== 'undefined';
}

export function isUnDef<T = unknown>(val?: T): val is T {
  return !isDef(val);
}

export function isObject(val: any): val is Record<any, any> {
  return val !== null && is(val, 'Object');
}

export function isEmpty<T = unknown>(val: T): val is T {
  if (isArray(val) || isString(val)) {
    return val.length === 0;
  }

  if (val instanceof Map || val instanceof Set) {
    return val.size === 0;
  }

  if (isObject(val)) {
    return Object.keys(val).length === 0;
  }

  return false;
}

export function isDate(val: unknown): val is Date {
  return is(val, 'Date');
}

export function isNull(val: unknown): val is null {
  return val === null;
}

export function isNullAndUnDef(val: unknown): val is null | undefined {
  return isUnDef(val) && isNull(val);
}

export function isNullOrUnDef(val: unknown): val is null | undefined {
  return isUnDef(val) || isNull(val);
}

export function isNumber(val: unknown): val is number {
  return is(val, 'Number');
}

export function isPromise<T = any>(val: unknown): val is Promise<T> {
  return is(val, 'Promise') && isObject(val) && isFunction(val.then) && isFunction(val.catch);
}

export function isString(val: unknown): val is string {
  return is(val, 'String');
}

export function isFunction(val: unknown): val is Function {
  return typeof val === 'function';
}

export function isBoolean(val: unknown): val is boolean {
  return is(val, 'Boolean');
}

export function isRegExp(val: unknown): val is RegExp {
  return is(val, 'RegExp');
}

export function isArray(val: any): val is Array<any> {
  return val && Array.isArray(val);
}

export function isWindow(val: any): val is Window {
  return typeof window !== 'undefined' && is(val, 'Window');
}

export function isElement(val: unknown): val is Element {
  return isObject(val) && !!val.tagName;
}

export function isMap(val: unknown): val is Map<any, any> {
  return is(val, 'Map');
}

export function isUrl(path: string): boolean {
  const reg = /^http(s)?:\/\/([\w-]+\.)+[\w-]+(\/[\w- .\/?%&=]*)?/;
  return reg.test(path);
}

export function isUrlEncode(uri: string): boolean {
  try {
    return uri !== decodeURIComponent(uri);
  } catch (error) {}

  return false;
}

export async function sha256(message: string): Promise<string> {
  // 编码 Message 为 Uint8Array
  const msgBuffer = new TextEncoder().encode(message);
  // 计算 hash（返回 ArrayBuffer）
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  // 转换为 byte array
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  // 转为十六进制字符串
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// 获取 Diasiyui 当前主题的颜色，包含 primary，secondary，accent，success，warning，error, info 等
export function getThemeColor() {
  const styles = getComputedStyle(document.documentElement);
  const colorMap: Record<string, string> = {};
  [
    "primary",
    "primary-content",
    "secondary",
    "secondary-content",
    "accent",
    "accent-content",
    "neutral",
    "neutral-content",
    "base-100",
    "base-200",
    "base-300",
    "base-content",
    "info",
    "info-content",
    "success",
    "success-content",
    "warning",
    "warning-content",
    "error",
    "error-content"
].forEach(color => {
    colorMap[color] = styles.getPropertyValue(`--color-${color}`).trim();
  });
  return colorMap;
}

export function getStateSvgUrl(username: string, game: string) {
  let url = `${location.origin}/embed/state/${encodeURIComponent(username)}/${encodeURIComponent(game)}.svg?`;
  const theme = getThemeColor();
  url += 'content=' + encodeURI(theme['base-content']) + '&';
  url += 'bg=' + encodeURI(theme['base-300']) + '&';
  url += 'win=' + encodeURI(theme['success']) + '&';
  url += 'draw=' + encodeURI(theme['warning']) + '&';
  url += 'loss=' + encodeURI(theme['error']) + '&';
  url += 'score=' + encodeURI(theme['info']);
  return url;
}

export async function copySvgUrlAsImage(svgUrl: string, name = '') {
  try {
    // 方案1: 同时复制图片数据和 HTML（推荐）
    const response = await fetch(svgUrl);
    const blob = await response.blob();
    
    // 创建包含图片引用的 HTML
    const html = `<img src="${svgUrl}" alt="${name}" />`;
    
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'image/svg+xml': blob,
        'text/plain': new Blob([svgUrl], { type: 'text/plain' })
      })
    ]);
    
    return true;
  } catch (err) {
    return false;
  }
}
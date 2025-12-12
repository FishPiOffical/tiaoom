export function openSmallWindow(url: string, width = 320, height = 320) {
  const left = Math.round((screen.width - width) / 2);
  const top = Math.round((screen.height - height) / 2);
  const features = [
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    'toolbar=no',
    'menubar=no',
    'status=no',
    'resizable=yes',
    'scrollbars=yes'
  ].join(',');
  // 必须在用户交互（click）事件里调用，否则会被拦截
  const win = window.open(url, '_blank', features);
  if (!win) {
    console.warn('弹窗可能被拦截，请在用户点击事件中打开或提示用户允许弹窗。');
  }
  return win;
}
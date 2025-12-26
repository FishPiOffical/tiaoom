/**
 * 俄罗斯方块工具函数
 */

/**
 * 获取颜色值的辅助函数
 * 将十六进制颜色值或CSS类名转换为实际颜色值
 * @param colorClass 颜色类名或十六进制颜色值
 * @returns 实际颜色值
 */
export function getColorValue(colorClass: string): string {
  // 如果已经是十六进制颜色值或rgb格式，直接返回
  if (colorClass.startsWith('#') || colorClass.startsWith('rgb')) {
    return colorClass
  }

  // 如果是CSS类名，映射为实际颜色值（使用 DaisyUI 主题变量）
  const colorMap: Record<string, string> = {
    'bg-cyan-500': 'oklch(var(--p))',      // 使用 DaisyUI 主题变量
    'bg-blue-500': 'oklch(var(--s))',      // 使用 DaisyUI 主题变量
    'bg-orange-500': 'oklch(var(--a))',    // 使用 DaisyUI 主题变量
    'bg-yellow-500': 'oklch(var(--wa))',   // 使用 DaisyUI 主题变量
    'bg-green-500': 'oklch(var(--su))',    // 使用 DaisyUI 主题变量
    'bg-purple-500': 'oklch(var(--er))',   // 使用 DaisyUI 主题变量
    'bg-red-500': 'oklch(var(--pc))',      // 使用 DaisyUI 主题变量
    'bg-gray-500': 'oklch(var(--b3))'      // 使用 DaisyUI 主题变量
  }

  return colorMap[colorClass] || 'oklch(var(--b3))'
}

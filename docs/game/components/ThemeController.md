# ThemeController 组件

`ThemeController` 组件提供了一个下拉菜单，允许用户切换应用程序的主题。

## 功能

- **主题列表**: 显示所有可用的主题。
- **当前主题指示**: 高亮显示当前选中的主题。
- **主题预览**: 每个选项显示该主题的颜色预览（Base, Primary, Secondary, Accent）。
- **切换主题**: 点击选项即可切换主题。

## 依赖

- `@/hook/useTheme`: `useTheme` 钩子，提供 `theme` (当前主题), `themes` (主题列表), `setTheme` (设置主题方法)。
- `Icon`: 用于显示下拉箭头和选中标记。

## 使用方法

通常放置在导航栏或设置菜单中。

```vue
<ThemeController />
```

## 样式

- 使用 DaisyUI 的 `dropdown` 组件。
- 预览色块使用 grid 布局展示。
- 下拉菜单限制高度并支持滚动。

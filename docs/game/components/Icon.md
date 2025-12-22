# Icon 组件

`Icon` 组件是一个通用的图标包装器，支持渲染 Iconify 图标字符串或 Vue 组件/渲染函数作为图标。

## Props

| 属性名 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `icon` | `string \| RenderFunction` | 必填 | 图标名称（Iconify 格式，如 `mdi:home`）或 Vue 渲染函数/组件对象。 |
| `color` | `string` | `undefined` | 图标颜色。 |
| `size` | `string \| number` | `undefined` | 图标大小。如果是数字，单位为 `px`；如果是字符串，则直接使用。 |

## 功能

- **多态渲染**: 
  - 如果 `icon` 是对象或函数，则作为 Vue 组件渲染 (`<component :is="icon" />`)。
  - 如果 `icon` 是字符串，则使用 `@iconify/vue` 的 `Icon` 组件渲染。
- **样式定制**: 支持通过 props 设置颜色和大小。

## 依赖

- `vue`: `computed`, `RenderFunction`
- `@iconify/vue`: `Icon`
- `@/utils`: `isObject`, `isFunction`, `isNumber`

## 使用方法

```vue
<!-- 使用 Iconify 字符串 -->
<Icon icon="mdi:home" color="red" size="24" />

<!-- 使用组件对象 -->
<Icon :icon="MyIconComponent" />
```

## 样式

组件使用 scoped CSS 定义了 `.icon` 类，确保图标垂直居中、大小继承或自定义，并处理了 SVG 的填充色。

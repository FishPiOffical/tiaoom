# Tiaoom Claude Skill 使用说明

## 什么是 Claude Skill？

Claude Skill 是一个为 Claude AI 助手设计的知识库文件，包含了特定领域的专业知识和最佳实践。当开发者在使用 Claude 进行开发时，可以将这个 Skill 文件提供给 Claude，使其成为该领域的专家助手。

## 本仓库的 Claude Skill

本仓库包含以下 Claude Skill：

### 1. Tiaoom 竞技大厅游戏开发专家 (`tiaoom-game-development-skill.md`)

这个 Skill 文件为 Claude 提供了完整的 Tiaoom 游戏开发知识，包括：

- **后端开发**：GameRoom 类的实现、事件处理、数据持久化等
- **前端开发**：Vue 3 组件开发、状态管理、UI 组件使用等
- **通信协议**：WebSocket 实现、消息收发等
- **游戏功能**：倒计时、积分系统、游戏回放等
- **开发流程**：从创建到测试的完整流程
- **最佳实践**：性能优化、用户体验、代码质量等
- **常见问题**：FAQ 和解决方案

## 如何使用

### 方法 1：在对话开始时提供

在开始与 Claude 的对话时，可以这样说：

```
我想使用 Tiaoom 框架开发一个新游戏。请先阅读这个 Skill 文件：
[粘贴 tiaoom-game-development-skill.md 的内容]
```

### 方法 2：在 Claude Projects 中使用

如果你使用 Claude Pro 或 Team 版本，可以：

1. 创建一个新的 Project
2. 将 `tiaoom-game-development-skill.md` 添加到 Project Knowledge
3. 在该 Project 中进行所有 Tiaoom 相关的开发

### 方法 3：通过 GitHub Copilot 使用

如果你使用 GitHub Copilot，这个 Skill 可以作为上下文提供给 AI：

1. 在项目中打开 `tiaoom-game-development-skill.md`
2. 开始编写代码时，Copilot 会自动参考这个文件的内容

## 使用示例

### 示例 1：创建新游戏

```
基于 Tiaoom Skill，我想创建一个名为"猜数字"的游戏，2-4人，每人轮流猜一个1-100的数字，
最接近目标数字的玩家获胜。请帮我生成后端和前端代码。
```

### 示例 2：添加功能

```
我已经有了一个五子棋游戏，现在想添加30秒的回合倒计时功能。
根据 Tiaoom Skill，应该如何实现？
```

### 示例 3：问题排查

```
我的游戏结束后，玩家无法离开房间。根据 Tiaoom Skill，可能是什么原因？
```

## 上传到 tiaoom-skills 仓库

这个 Skill 文件可以上传到专门的 tiaoom-skills 仓库，供社区共享：

1. Fork 或 Clone tiaoom-skills 仓库
2. 将 `tiaoom-game-development-skill.md` 复制到该仓库
3. 提交 Pull Request

## 贡献

如果你发现 Skill 文件中有任何错误或希望添加更多内容，欢迎：

1. 提交 Issue 描述问题或建议
2. 提交 Pull Request 直接修改
3. 在社区讨论中分享你的使用经验

## 维护

该 Skill 文件应该随着 Tiaoom 框架的更新而更新。主要更新时机：

- Tiaoom 发布新版本时
- 添加新的 API 或功能时
- 发现文档错误或不清晰时
- 收集到新的最佳实践时

## 许可证

本 Skill 文件遵循与 Tiaoom 项目相同的许可证。

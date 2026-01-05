# tiaoom-skills

Tiaoom 竞技大厅游戏开发相关的 Claude Skills 集合。

## Skills 列表

### [Tiaoom 竞技大厅游戏开发助手](./game-development.md)

用于帮助开发者为 Tiaoom 竞技大厅（ https://room.adventext.fun ）开发新游戏的 Claude Skill。

**涵盖内容：**
- 后端游戏逻辑开发（TypeScript + GameRoom）
- 前端 Vue 3 组件开发
- WebSocket 实时通信
- 游戏状态管理与持久化
- 倒计时功能实现
- 游戏数据管理
- 游戏回放功能
- 积分系统
- 开发调试与部署

**适用场景：**
- 为 Tiaoom 平台开发新的多人在线游戏
- 理解 Tiaoom 游戏开发架构和最佳实践
- 快速上手 Tiaoom 游戏开发流程

## 关于 Tiaoom

Tiaoom 是一个基于 Node.js、TypeScript、Vue 3 的实时多人在线游戏平台，支持开发各种回合制和实时对战游戏。

- 项目地址：https://github.com/FishPiOffical/tiaoom
- 在线体验：https://room.adventext.fun

## 如何使用

将对应的 Skill 文件内容提供给 Claude，即可获得相应领域的开发帮助。

### 测试 Skill

请参考 [测试指南](./TESTING.md) 了解如何测试和验证 Skill 的功能。

**快速测试步骤：**
1. 将 `tiaoom-game-development.md` 文件上传到 Claude 对话
2. 提问："我想为 Tiaoom 平台开发一个井字棋游戏，请问我需要做什么？"
3. 验证 Claude 是否提供符合 Tiaoom 规范的完整指导和代码示例
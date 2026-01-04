# 上传到 tiaoom-skills 仓库的说明

## 已创建的文件

本次工作已经创建了以下文件，这些文件已提交到当前分支 `copilot/add-claude-skills-for-game`：

1. **tiaoom-game-development-skill.md** - Tiaoom 竞技大厅游戏开发 Claude Skill
2. **CLAUDE_SKILL_README.md** - Claude Skill 使用说明文档

## 如何上传到 tiaoom-skills 仓库

### 选项 1: 如果 tiaoom-skills 仓库已存在

```bash
# 1. Clone tiaoom-skills 仓库
git clone https://github.com/FishPiOffical/tiaoom-skills.git
cd tiaoom-skills

# 2. 复制 skill 文件
cp ../tiaoom/tiaoom-game-development-skill.md ./
cp ../tiaoom/CLAUDE_SKILL_README.md ./README.md

# 3. 提交并推送
git add .
git commit -m "Add Tiaoom game development Claude Skill"
git push origin main
```

### 选项 2: 如果 tiaoom-skills 仓库不存在

```bash
# 1. 在 GitHub 上创建新仓库 tiaoom-skills
# 访问 https://github.com/new
# 仓库名: tiaoom-skills
# 描述: Claude Skills for Tiaoom game development

# 2. 在本地初始化仓库
mkdir tiaoom-skills
cd tiaoom-skills
git init

# 3. 复制文件
cp ../tiaoom/tiaoom-game-development-skill.md ./
cp ../tiaoom/CLAUDE_SKILL_README.md ./README.md

# 4. 提交并推送
git add .
git commit -m "Initial commit: Add Tiaoom game development Claude Skill"
git branch -M main
git remote add origin https://github.com/FishPiOffical/tiaoom-skills.git
git push -u origin main
```

### 选项 3: 通过 Pull Request（推荐）

如果 tiaoom-skills 仓库已存在且有其他协作者：

```bash
# 1. Fork tiaoom-skills 仓库到你的 GitHub 账号

# 2. Clone 你的 fork
git clone https://github.com/YOUR_USERNAME/tiaoom-skills.git
cd tiaoom-skills

# 3. 创建新分支
git checkout -b add-game-development-skill

# 4. 复制文件
cp ../tiaoom/tiaoom-game-development-skill.md ./
cp ../tiaoom/CLAUDE_SKILL_README.md ./README.md

# 5. 提交
git add .
git commit -m "Add Tiaoom game development Claude Skill"
git push origin add-game-development-skill

# 6. 在 GitHub 上创建 Pull Request
```

## 文件说明

### tiaoom-game-development-skill.md

这是主要的 Skill 文件，包含：

- **架构概述**: Tiaoom 的事件驱动架构
- **后端开发**: 
  - 文件命名规范
  - GameRoom 类的实现
  - 核心方法（init, onStart, onCommand, getStatus, getData）
  - 消息发送方法
  - 游戏结束与积分系统
  - 倒计时功能
  - 数据持久化
- **前端开发**:
  - Vue 3 组件开发
  - GameView 布局使用
  - 事件监听（useGameEvents）
  - 状态管理（useGameStore）
  - 倒计时处理
- **通信协议**: WebSocket 实现示例
- **游戏回放**: 录制和播放功能
- **开发流程**: 从创建到测试的完整步骤
- **最佳实践**: 7 条开发建议
- **常见问题**: 5 个 FAQ 及解决方案
- **参考示例**: 4 个现有游戏的参考

### CLAUDE_SKILL_README.md

使用说明文档，包含：

- Claude Skill 的概念解释
- 三种使用方法（对话、Projects、Copilot）
- 使用示例
- 贡献指南

## 后续步骤

1. 选择上述三个选项之一，将文件上传到 tiaoom-skills 仓库
2. 可以考虑在 tiaoom-skills 仓库添加更多 skills，例如：
   - Tiaoom 后端部署 Skill
   - Tiaoom 前端集成 Skill
   - Tiaoom 性能优化 Skill
   - 特定游戏类型开发 Skill（卡牌游戏、棋类游戏等）
3. 在主 README.md 中添加链接指向 tiaoom-skills 仓库

## 当前状态

✅ 文件已创建并提交到分支 `copilot/add-claude-skills-for-game`
✅ 可以通过 Pull Request 合并到主分支
✅ 准备好上传到 tiaoom-skills 仓库

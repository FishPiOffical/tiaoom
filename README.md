<p align="center">
  <img width="200" src="logo.png">
</p>

<h1 align="center">Tiaoom</h1>
<p align="center">组件化游戏房间管理系统</p>

## ✨功能
- unknown

## 📦 初始化配置
- 执行`npm run init`（仅第一次）；

## ⚙️ 调试
1. 执行`npm install`;
2. 使用 Visual Studio Code 运行调试（直接按下`F5`即可）。

## 🛡 部署
服务器需安装 `nodejs` 和 `npm` 。部署执行如下脚本：
```bash
npm install
```

编译前端代码：  
```bash
npm run build
```

启动服务：
```bash
npm start
```

以守护进程方式，启动服务：
```bash
forever start ./bin/www --uid fishpi-bot
```
or
```bash
pm2 start -n fishpi-bot npm -- start
```

## 📁 目录与文件
- .vscode - VSCode 调试配置
- lib - 自定义类库
- script - 初始化脚本 
- src - 入口
- config.json - 运行配置档案

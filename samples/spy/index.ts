import express, { Express, Request, Response } from "express";
import { Controller } from "./src";
import path from "path";

export class SpyGame {
  app: Express = express();
  controller = new Controller();
  init() {
    const socketPort = 27015;
    const title = "Who is Spy?";
    const address = `ws://127.0.0.1:${socketPort}`;

    // 设置渲染文件的目录
    this.app.set("views", "./views");
    // 设置渲染引擎为html
    this.app.set("view engine", "ejs");
    this.app.use(express.static(path.join(__dirname, 'public')));

    // 调用路由，进行页面渲染
    this.app.get("/", (req: any, res: any) => {
      // 调用渲染模板
      res.render("index", {
        // 传参
        title,
        address,
      });
    });
    this.app.get("/api/room/:id", (req: any, res: any) => {
      const room = this.controller.tiao?.rooms.find((room) => room.id == req.params.id);
      if (room) res.json({ code: 0, data: room });
      else res.json({ code: 1, message: "room not found" });
    });
    this.app.get("/api/player/:id", (req: any, res: any) => {
      const player = this.controller.tiao?.players.find((player) => player.id == req.params.id);
      if (player) res.json({ code: 0, data: player });
      else res.json({ code: 1, message: "player not found" });
    });
    this.app.get("/api/players", (req: any, res: any) => {
      res.json({ code: 0, data: this.controller.tiao?.players });
    });
    this.app.get("/api/rooms", (req: any, res: any) => {
      res.json({ code: 0, data: this.controller.tiao?.rooms });
    });
    this.app.listen(27016);
    this.controller.run(socketPort);
  }
}

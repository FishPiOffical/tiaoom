import express, { Express, Request, Response } from "express";
import { Controller, main } from "./src";
import path from "path";

export class SpyGame {
  app: Express = express();
  controller = new Controller();
  init() {
    const title = "Who is Spy?";
    const address = "ws://127.0.0.1:27015";

    // 设置渲染文件的目录
    this.app.set("views", "./views");
    // 设置渲染引擎为html
    this.app.set("view engine", "ejs");
    this.app.use(express.static(path.join(__dirname, 'public')));

    // 调用路由，进行页面渲染
    this.app.get("/", function (req: any, res: any) {
      // 调用渲染模板
      res.render("index", {
        // 传参
        title,
        address,
      });
    });
    this.app.post("/", function (req: any, res: any) {
      res.render("index", {
        // 传参
        title,
        address,
      });
    });
    this.app.listen(27016);
    this.controller.run();
  }
}

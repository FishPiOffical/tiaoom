var express = require("express");
var ejs = require("ejs");

export class Tester {
  app: any;
  init() {
    this.app = express();
    //设置渲染文件的目录
    this.app.set("views", "./views");
    //设置html模板渲染引擎
    this.app.engine("html", ejs.__express);
    //设置渲染引擎为html
    this.app.set("view engine", "html");

    //调用路由，进行页面渲染
    this.app.get("/", function (req: any, res: any) {
      //调用渲染模板
      res.render("index.html", {
        //传参
        title: "Tiaoom client tester",
        address: "ws://127.0.0.1:27015",
      });
    });
    this.app.post("/", function (req: any, res: any) {
      res.render("index.html", {
        //传参
        title: "Tiaoom client tester",
        address: "ws://127.0.0.1:27015",
      });
    });
    this.app.listen(27016);
  }
}

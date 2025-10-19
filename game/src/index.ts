import http from "http";
import express, { Express, Request, Response } from "express";
import session from 'express-session';
import sessionStore from 'session-file-store';
import { Controller } from "./controller";
import cookieParser from 'cookie-parser';
import { login as fishpiLogin } from "./login/fishpi";

import path from "path";
const FileStore = sessionStore(session);

declare module 'express-session' {
  export interface SessionData {
    error: string;
    player: { id: string, name: string };
  }
}
export class Game {
  app: Express = express();
  controller?: Controller;
  run () {
    const serverPort = 27016;
    const domain = "127.0.0.1";
    const title = "Game Rooms";
    const address = `ws://${domain}:${serverPort}`;
    const gameName = "Game-Rooms";

    // 设置渲染文件的目录
    this.app.set("views", path.join(__dirname, '..', 'views'));
    // 设置渲染引擎为html
    this.app.set("view engine", "ejs");
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: false }));
    this.app.use(cookieParser());
    this.app.use(express.static(path.join(__dirname, '..', 'public')));
    this.app.use(session({
      name: gameName,
      secret: gameName.replace(/-/g, '_').toUpperCase(),
      store: new FileStore({
        path: path.join(__dirname, '..', 'sessions')
      }),
      saveUninitialized: false,
      resave: false,
      cookie: {
          maxAge: 60 * 60 * 24 * 1000 * 365  // 有效期，单位是毫秒
      }
    })); 

    this.app.get("/", (req: Request, res: Response) => {
      if (!req.session.player) return res.redirect("/login");
      if (this.controller?.players.some((player) => player.name == req.session.player?.name && player.id != req.session.player?.id)) {
        req.session.player = undefined;
        req.session.error = "昵称已被占用";
        return res.redirect("/login");
      }
      res.render("index", { title, address, player: req.session.player });
    });
    this.app.get("/login", (req: Request, res: Response) => {
      const error = req.session.error || '';
      req.session.error = '';
      res.render("login", { title, message: error });
    });
    this.app.get("/login/fishpi", fishpiLogin);
    this.app.get("/logout", (req: Request, res: Response) => {
      req.session.destroy((err) => {
        if (err) return res.redirect("/");
        res.clearCookie(gameName);
        res.redirect("/login");
      });
    });
    this.app.post("/login", (req: Request, res: Response) => {
      if (this.controller?.players.some((player) => player.name == req.body.name)) {
        return res.render("login", { title, message: "昵称已被使用", ...req.body });
      }
      req.session.player = { name: req.body.name, id: new Date().getTime().toString() };
      res.redirect("/");
    });
    this.app.get("/api/room/:id", (req: Request, res: Response) => {
      const room = this.controller?.rooms.find((room) => room.id == req.params.id);
      if (room) res.json({ code: 0, data: room });
      else res.json({ code: 1, message: "room not found" });
    });
    this.app.get("/api/player/:id", (req: Request, res: Response) => {
      const player = this.controller?.players.find((player) => player.id == req.params.id);
      if (player) res.json({ code: 0, data: player });
      else res.json({ code: 1, message: "player not found" });
    });
    this.app.get("/api/players", (req: Request, res: Response) => {
      res.json({ code: 0, data: this.controller?.players });
    });
    this.app.get("/api/rooms", (req: Request, res: Response) => {
      res.json({ code: 0, data: this.controller?.rooms });
    });
    const server = http.createServer(this.app);
    server.listen(serverPort);
    this.controller = new Controller(server);
    this.controller?.run();
    console.info(`Server running at http://${domain}:${serverPort}/`);
  }
}


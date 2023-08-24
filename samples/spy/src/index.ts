import express, { Express, Request, Response } from "express";
import session from 'express-session';
import sessionStore from 'session-file-store';
import { Controller } from "./controller";
import cookieParser from 'cookie-parser';

import path from "path";
const FileStore = sessionStore(session);

declare module 'express-session' {
  export interface SessionData {
    player: { id: string, name: string };
  }
}
export class SpyGame {
  app: Express = express();
  controller = new Controller();
  run () {
    const socketPort = 27015;
    const domain = "127.0.0.1";
    const title = "Who is Spy?";
    const address = `ws://${domain}:${socketPort}`;

    // 设置渲染文件的目录
    this.app.set("views", "./views");
    // 设置渲染引擎为html
    this.app.set("view engine", "ejs");
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: false }));
    this.app.use(cookieParser());
    this.app.use(express.static(path.join(__dirname, 'public')));
    this.app.use(session({
      name: 'Spy-Game',
      secret: 'SPY_GAME',
      store: new FileStore(),
      saveUninitialized: false,
      resave: false,
      cookie: {
          maxAge: 60 * 60 * 24 * 1000 * 365  // 有效期，单位是毫秒
      }
    })); 

    this.app.get("/", (req: Request, res: Response) => {
      if (!req.session.player) return res.redirect("/login");
      res.render("index", { title, address, player: req.session.player });
    });
    this.app.get("/login", (req: Request, res: Response) => {
      res.render("login", { title });
    });
    this.app.post("/login", (req: Request, res: Response) => {
      req.session.player = { name: req.body.name, id: new Date().getTime().toString() };
      res.redirect("/");
    });
    this.app.get("/api/room/:id", (req: Request, res: Response) => {
      const room = this.controller.tiao?.rooms.find((room) => room.id == req.params.id);
      if (room) res.json({ code: 0, data: room });
      else res.json({ code: 1, message: "room not found" });
    });
    this.app.get("/api/player/:id", (req: Request, res: Response) => {
      const player = this.controller.tiao?.players.find((player) => player.id == req.params.id);
      if (player) res.json({ code: 0, data: player });
      else res.json({ code: 1, message: "player not found" });
    });
    this.app.get("/api/players", (req: Request, res: Response) => {
      res.json({ code: 0, data: this.controller.tiao?.players });
    });
    this.app.get("/api/rooms", (req: Request, res: Response) => {
      res.json({ code: 0, data: this.controller.tiao?.rooms });
    });
    this.app.listen(27016);
    this.controller.run(socketPort);
  }
}


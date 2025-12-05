import "reflect-metadata";
import path from "path";
import http from "http";
import express, { Express } from "express";
import session from 'express-session';
import sessionStore from 'session-file-store';
import { Controller } from "./controller";
import cookieParser from 'cookie-parser';
import createRoutes from "./routes/api";

const FileStore = sessionStore(session);

export class Game {
  app: Express = express();
  controller?: Controller;
  
  run() {
    const serverPort = 27015;
    const domain = "127.0.0.1";
    const gameName = "Game-Rooms";

    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: false }));
    this.app.use(cookieParser());
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

    // API 路由
    this.app.use("/api", createRoutes(this, gameName));

    const server = http.createServer(this.app);
    server.listen(serverPort);
    this.controller = new Controller(server);
    this.controller?.run();
    console.info(`Server running at http://${domain}:${serverPort}/`);
  }
}

new Game().run();

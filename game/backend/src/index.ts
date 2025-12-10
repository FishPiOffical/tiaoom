import "reflect-metadata";
import path from "path";
import http from "http";
import express, { Express } from "express";
import session from 'express-session';
import sessionStore from 'session-file-store';
import { Controller } from "./controller";
import cookieParser from 'cookie-parser';
import createRoutes from "./routes/api";
import utils from './utils'
import configRouter from "./routes/config";
import { AppDataSource } from "./entities";

const FileStore = sessionStore(session);

export class Game {
  app: Express = express();
  controller?: Controller;
  
  async run() {
    const serverPort = process.env.PORT || utils.config?.webport || 27015;
    const domain = "127.0.0.1";
    const gameName = "Game-Rooms";

    this.app.use(express.static(path.join(__dirname, "public")));
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: false }));
    this.app.use(cookieParser());
    this.app.use(session({
      name: utils.config?.secret.identity || gameName,
      secret: utils.config?.secret.session || gameName.replace(/-/g, '_').toUpperCase(),
      store: new FileStore({
        path: path.join(__dirname, '..', 'sessions')
      }),
      saveUninitialized: false,
      resave: false,
      cookie: {
        maxAge: 60 * 60 * 24 * 1000 * 365  // 有效期，单位是毫秒
      }
    }));

    const server = http.createServer(this.app);
    server.listen(serverPort);

    if (!utils.config) {
      this.app.use("/config", configRouter);
    } else {
      // API 路由
      await AppDataSource.initialize()
        .then(() => {
          console.log("Database connected");
          this.app.use("/config", (_req, res) => {
            res.redirect('/');
          });
          this.app.use("/api", createRoutes(this, gameName));
          this.controller = new Controller(server);
          this.controller?.run();
        })
        .catch((error) => console.log(error));
    }

    console.info(`Server running at http://${domain}:${serverPort}/`);
  }
}

new Game().run();

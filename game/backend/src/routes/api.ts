import { Router, Request, Response } from "express";
import { Controller } from "../controller";
import { login as fishpiLogin, register as fishpiRegister, updateUserInfo } from "../login/fishpi";
import { User } from "@/entities";

export interface GameContext {
  controller?: Controller;
}

const createRoutes = (game: GameContext, gameName: string) => {
  const router = Router();

  router.options("/config", (req: Request, res: Response) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.sendStatus(200);
  });
  router.get("/config", (req: Request, res: Response) => {
    // 允许跨域
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.json({
      code: 0,
      data: game.controller?.games
    });
  });

  router.get("/info", async (req: Request, res: Response) => {
    if (!req.session.player) {
      return res.json({ code: 403, message: "未登录" });
    }
    if (req.session.player.from == 'fishpi') {
      req.session.player = await updateUserInfo(req.session.player.id, req);
    }
    res.json({
      code: 0,
      data: {
        player: req.session.player
      }
    });
  });

  router.get("/message", (req: Request, res: Response) => {
    res.json({
      code: 0,
      data: {
        messages: game.controller?.messages || []
      }
    });
  });

  router.post("/login", (req: Request, res: Response) => {
    if (game.controller?.players.some((player) => player.name == req.body.name)) {
      return res.json({ code: 1, message: "昵称已被使用" });
    }
    req.session.player = new User(new Date().getTime().toString(), req.body.name, req.body.name);
    res.json({ code: 0, data: req.session.player });
  });

  router.get("/login/error", (req: Request, res: Response) => {
    if (req.session.error) {
      const error = req.session.error;
      req.session.error = undefined;
      return res.json({ code: 1, message: error });
    }
    res.json({ code: 0, data: true });
  });
  router.get("/login/fishpi", fishpiLogin);
  router.get("/register/fishpi", fishpiRegister);

  router.post("/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) return res.json({ code: 1, message: "退出失败" });
      game.controller?.rooms.forEach((room) => {
        const player = room.validPlayers.find((p) => p.id == req.session?.player?.id);
        if (player) {
          room.kickPlayer(player);
        }
      });
      res.clearCookie(gameName);
      res.json({ code: 0, message: "退出成功" });
    });
  });

  router.get("/rooms/:id", (req: Request, res: Response) => {
    const room = game.controller?.rooms.find((room) => room.id == req.params.id);
    if (room) res.json({ code: 0, data: room });
    else res.json({ code: 1, message: "room not found" });
  });

  router.get("/players/:id", (req: Request, res: Response) => {
    const player = game.controller?.players.find((player) => player.id == req.params.id);
    if (player) res.json({ code: 0, data: player });
    else res.json({ code: 1, message: "player not found" });
  });

  router.get("/players", (req: Request, res: Response) => {
    res.json({ code: 0, data: game.controller?.players });
  });

  router.get("/rooms", (req: Request, res: Response) => {
    res.json({ code: 0, data: game.controller?.rooms });
  });

  return router;
};

export default createRoutes;
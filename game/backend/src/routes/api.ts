import { Router, Request, Response } from "express";
import { Controller } from "../controller";
import { login as fishpiLogin } from "../login/fishpi";

export interface GameContext {
  controller?: Controller;
}

const createRoutes = (game: GameContext, gameName: string) => {
  const router = Router();

  router.get("/config", (req: Request, res: Response) => {
    res.json({
      code: 0,
      data: game.controller?.games
    });
  });

  router.get("/info", (req: Request, res: Response) => {
    if (!req.session.player) {
      return res.json({ code: 403, message: "未登录" });
    }
    res.json({
      code: 0,
      data: {
        player: req.session.player
      }
    });
  });

  router.post("/login", (req: Request, res: Response) => {
    if (game.controller?.players.some((player) => player.name == req.body.name)) {
      return res.json({ code: 1, message: "昵称已被使用" });
    }
    req.session.player = { name: req.body.name, id: new Date().getTime().toString() };
    res.json({ code: 0, data: req.session.player });
  });

  router.get("/login/fishpi", fishpiLogin);

  router.post("/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) return res.json({ code: 1, message: "退出失败" });
      game.controller?.rooms.forEach((room) => {
        const player = room.validPlayers.find((p) => p.name == req.session?.player?.name && p.id == req.session?.player?.id);
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
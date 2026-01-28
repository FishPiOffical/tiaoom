import { Router, Request, Response } from "express";
import { Controller } from "../controller";
import { login as fishpiLogin, register as fishpiRegister, updateUserInfo } from "../login/fishpi";
import { login as steamLogin } from "../login/steam";
import { bind as steamBind } from "../login/steam";
import { login as githubLogin, bind as githubBind } from "../login/github";
import { login as wechatLogin, bind as wechatBind } from "../login/wechat";
import { Record, RecordRepo, User, UserRepo, AppDataSource, PlayerStats, ManageRepo } from "@/entities";
import { getPlayerStats, isConfigured } from "@/utils";
import { FindOptionsWhere, Like } from "typeorm";
import GameRouter from "./game";
import Games, { GameRoom } from "@/games";
import { getThirdPartyType } from "@/login";

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

  router.get("/is-configured", async (_req: Request, res: Response) => {
    res.json({ code: 0, data: isConfigured() });
  });

  router.get("/config", (req: Request, res: Response) => {
    // 允许跨域
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.json({
      code: 0,
      data: {
        game: game.controller?.games,
        thirdParty: getThirdPartyType(),
      }
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

  router.get("/user/:username", async (req: Request, res: Response) => {
    const user = await UserRepo().findOneBy({ username: req.params.username });
    if (user) {
      const state = await getPlayerStats(user.username);
      res.json({ code: 0, data: { ...user, state } });
    } else {
      res.json({ code: 1, message: "用户不存在" });
    }
  });

  router.get("/leaderboard/:type", async (req: Request, res: Response) => {
    const { type } = req.params;
    const statsRepo = AppDataSource.getRepository(PlayerStats);
    
    const leaderboard = await statsRepo.createQueryBuilder("stats")
      .select("stats.player", "player")
      .addSelect("stats.wins", "wins")
      .addSelect("stats.total", "total")
      .addSelect("stats.draws", "draws")
      .addSelect("stats.losses", "losses")
      .addSelect("stats.score", "score")
      .addSelect("(stats.wins * 1.0 / stats.total)", "winRate")
      .addSelect("(stats.wins + 1.0) / (stats.total + 2.0)", "adjustedRate")
      .where("stats.type = :type", { type })
      .andWhere("stats.total > 0")
      .orderBy("stats.score", "DESC")
      .addOrderBy("adjustedRate", "DESC")
      .addOrderBy("stats.total", "DESC")
      .limit(20)
      .getRawMany();

    res.json({ code: 0, data: leaderboard });
  });

  router.get("/user/:username/record", async (req: Request, res: Response) => {
    const { p, count, type } = req.query;
    const page = parseInt(p as string) || 1;
    const pageSize = parseInt(count as string) || 10;
    const filter: FindOptionsWhere<Record> = {};
    if (type) filter.type = type as string;
    const records = await RecordRepo().findAndCount({
      skip: (page - 1) * pageSize,
      take: pageSize,
      where: { players: Like(`%"${req.params.username}"%`), ...filter },
      order: { createdAt: "DESC" },
    });
    res.json({ code: 0, data: { records: records[0], total: records[1] } });
  });

  router.get("/record/:id", async (req: Request, res: Response) => {
    const record = await RecordRepo().findOneBy({ id: Number(req.params.id) });
    if (record) {
      res.json({ code: 0, data: record });
    } else {
      res.json({ code: 1, message: "记录不存在" });
    }
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
    if (!isConfigured()) req.session.player.isAdmin = true;
    res.json({ code: 0, data: req.session.player });
  });

  router.post("/visitor/updateName", async (req: Request, res: Response) => {
    if (!req.session.player?.isVisitor) {
      return res.json({ code: 1, message: "仅游客可使用此功能" });
    }
    const newName = req.body.name;
    if (game.controller?.players.some((player) => player.name == newName)) {
      return res.json({ code: 1, message: "昵称已被使用" });
    }
    req.session.player.nickname = newName + ' (游客)';
    res.json({ code: 0, data: req.session.player });
  });

  router.post("/login/visitor", (req: Request, res: Response) => {
    if (!req.session.player) {
      const id = new Date().getTime().toString();
      const name = "游客" + id.slice(-4);
      req.session.player = new User(id, name, name);
      req.session.player.isVisitor = true;
      req.session.save();
    }
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
  router.get("/login/steam", steamLogin);
  router.get("/login/github", githubLogin);
  router.get("/login/wechat", wechatLogin);
  router.get("/bind/github", githubBind);
  router.get("/bind/steam", steamBind);
  router.get("/bind/wechat", wechatBind);

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

  router.use("/game", GameRouter)

  Object.entries(Games || {}).forEach(([key, game]) => {
    const defaultExport = game.default as any;
    if (defaultExport.prototype instanceof GameRoom) {
      const routers = (new defaultExport() as any).Routers;
      if (routers) router.use(`/game/${key}`, routers);
    }
  });

  return router;
};

export default createRoutes;
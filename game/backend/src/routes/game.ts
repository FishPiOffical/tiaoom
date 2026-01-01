import { ManageRepo } from "@/entities";
import Games, { GameRoom, IGameData } from "../games";
import { Router, Request, Response } from "express";


const router = Router();

router.get("/manages", async (req: Request, res: Response) => {
  const manages = await ManageRepo().find();
  res.json({ 
    code: 0, 
    data: Object.keys(Games || {}).map((gameKey) => {
      const defaultExport = Games[gameKey].default as any;
      return {
        key: gameKey,
        name: Games[gameKey]?.name,
        canManage: defaultExport.prototype instanceof GameRoom && 
          (new defaultExport() as any).getList && 
          (req.session.player?.isAdmin || 
          manages.some(m => m.type === gameKey && m.manages.includes(req.session.player?.username || ''))),
      };
    })
  });
});

router.use("/manages/:gameKey", async (req: Request, res: Response, next) => {
    try {
    const { gameKey } = req.params;
    if (!Games[gameKey]) {
      throw new Error("游戏不存在");
    }
    const gameData = Games[gameKey];
    if (!gameData || !(gameData.default.prototype instanceof GameRoom) && 
        (Games[gameKey]?.default.prototype as any).getList) {
      throw new Error("该游戏不支持数据管理");
    }
    const manages = await ManageRepo().findOneBy({ type: gameKey });
    if (!req.session.player?.isAdmin 
      && !(manages && manages.manages.includes(req.session.player?.username || ''))) {
      throw new Error("权限不足，请联系管理员开通权限");
    }
    next();
  } catch (error: any) {
    res.json({ code: 1, message: error.message });
  }
});

router.get("/manages/:gameKey/list", async (req: Request, res: Response) => {
  try {
    const { gameKey } = req.params;
    const gameData = Games[gameKey];
    const gameManager = gameData.default as any as new () => IGameData<any>;
    const query = { page: 1, count: 20, ...req.query };
    const list = await new gameManager().getList(query);
    res.json({ code: 0, data: list });
  } catch (error: any) {
    res.json({ code: 1, message: error.message });
  }
});

router.post("/manages/:gameKey", async (req: Request, res: Response) => {
  try {
    const { gameKey } = req.params;
    const gameData = Games[gameKey];
    const gameManager = gameData.default as any as new () => IGameData<any>;
    const record = req.body;
    await new gameManager().insert(record);
    res.json({ code: 0, message: "保存成功" });
  } catch (error: any) {
    res.json({ code: 1, message: error.message });
  }
});

router.put("/manages/:gameKey/:id", async (req: Request, res: Response) => {
  try {
    const { gameKey, id } = req.params;
    const gameData = Games[gameKey];
    const gameManager = gameData.default as any as new () => IGameData<any>;
    const record = req.body;
    await new gameManager().update(id, record);
    res.json({ code: 0, message: "更新成功" });
  } catch (error: any) {
    res.json({ code: 1, message: error.message });
  }
});

router.delete("/manages/:gameKey/:id", async (req: Request, res: Response) => {
  try {
    const { gameKey, id } = req.params;
    const gameData = Games[gameKey];
    const gameManager = gameData.default as any as new () => IGameData<any>;
    await new gameManager().delete(id);
    res.json({ code: 0, message: "删除成功" });
  } catch (error: any) {
    res.json({ code: 1, message: error.message });
  }
});

router.post("/manages/:gameKey/import", async (req: Request, res: Response) => {
  try {
    const { gameKey } = req.params;
    const gameData = Games[gameKey];
    const gameManager = gameData.default as any as new () => IGameData<any>;
    const records = req.body;
    if (!Array.isArray(records)) {
      throw new Error("数据格式错误，应为数组");
    }
    const manager = new gameManager();
    let count = 0;
    for (const record of records) {
      try {
        await manager.insert(record);
        count++;
      } catch (e) {
        console.error(e);
      }
    }
    res.json({ code: 0, message: `成功导入 ${count} 条数据` });
  } catch (error: any) {
    res.json({ code: 1, message: error.message });
  }
});

export default router;
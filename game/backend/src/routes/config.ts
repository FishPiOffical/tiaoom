import { IConfig } from "#/index";
import utils from "@/utils";
import { Router } from "express";
import fs from "fs";
import path from "path";

const randomStr = () => randomUp(Math.random().toString(36).slice(2));
const randomUp = (s: string) => s.split('').map((s) => Math.floor(Math.random() * 10) % 2 ? s : s.toUpperCase()).join('');

const router = Router();

router.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "config.html"));
});

router.post("/", (req, res) => {
  const { webport, goldenKey, host, port, username, password, database, prefix, marketKey } = req.body;
  
  const config: IConfig = {
    webport, secret: {
      identity: '_SESSION_ID_' + randomStr(),
      session: randomStr(),
      goldenKey,
      marketKey,
    },
    database: {
      host, port, username, password, database, entityPrefix: prefix + (prefix.endsWith('_') ? '' : '_')
    },
  }

  fs.writeFileSync(path.join(__dirname, "..", "config.json"), JSON.stringify(config, null, 2));

  res.json({ code: 0, data: true, msg: '配置已保存，服务器即将重启...' });

  setTimeout(() => {
    process.exit(0);
  }, 200);
});

export default router;
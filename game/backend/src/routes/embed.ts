import { Router, Request, Response } from "express";
import { Controller } from "../controller";
import { login as fishpiLogin, register as fishpiRegister, updateUserInfo } from "../login/fishpi";
import { login as steamLogin } from "../login/steam";
import { bind as steamBind } from "../login/steam";
import { login as githubLogin, bind as githubBind } from "../login/github";
import { login as wechatLogin, bind as wechatBind } from "../login/wechat";
import { Record, RecordRepo, User, UserRepo, AppDataSource, PlayerStats, ManageRepo, UserBindRepo } from "@/entities";
import { getPlayerStats, getPlayerStat, isConfigured } from "@/utils";
import { FindOptionsWhere, Like } from "typeorm";
import GameRouter from "./game";
import Games, { GameRoom } from "@/games";
import { getThirdPartyType, saveUser } from "@/login";
import FishPi from "fishpi";


const router = Router();

function valueToColor(value: string, defaultValue: string): string {
  if (!value) return defaultValue;
  if (value.match(/^([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/)) {
    return '#' + value;
  } else {
    return value;
  }
}

router.get('/state/:username/:game.svg', async (req: Request, res: Response) => {
  const { username, game } = req.params;

  // Extract color variables from query params
  const contentColor = valueToColor(req.query['content'] as string, '#000');
  const bgColor = valueToColor(req.query['bg'] as string, '#f3f4f6');
  const winColor = valueToColor(req.query['win'] as string, '#16a34a');
  const drawColor = valueToColor(req.query['draw'] as string, '#ca8a04');
  const lossColor = valueToColor(req.query['loss'] as string, '#dc2626');
  const scoreColor = valueToColor(req.query['score'] as string, '#06b6d4');
  const progressBg = valueToColor(req.query['progress-bg'] as string, '#e5e7eb');
  const textGray = valueToColor(req.query['text-gray'] as string, '#6b7280');
  const errorColor = valueToColor(req.query['error'] as string, 'red');

  try {
    const stats = await getPlayerStat(username, game);
    const gameName = Games[game]?.name || game;
    let htmlContent = '';
    if (stats) {
      const winPercent = stats.total > 0 ? (stats.wins / stats.total * 100) : 0;
      const drawPercent = stats.total > 0 ? (stats.draws / stats.total * 100) : 0;
      const lossPercent = stats.total > 0 ? (stats.losses / stats.total * 100) : 0;
      htmlContent = `
      <style>
        :root {
          --bg-color: ${bgColor};
          --win-color: ${winColor};
          --draw-color: ${drawColor};
          --loss-color: ${lossColor};
          --score-color: ${scoreColor};
          --progress-bg: ${progressBg};
          --content-color: ${contentColor};
          --text-gray: ${textGray};
        }
        .card { color: var(--content-color); background-color: var(--bg-color); border-radius: 8px; padding: 16px; font-family: system-ui, -apple-system, sans-serif; box-sizing: border-box; }
        .header { display: flex; justify-content: space-between; align-items: baseline; }
        .game-name { font-size: 14px; font-weight: bold; margin-bottom: 4px; opacity: 0.6; }
        .score-label { font-size: 12px; opacity: 0.6; }
        .stats { display: flex; justify-content: space-between; font-size: 12px; }
        .win { color: var(--win-color); }
        .draw { color: var(--draw-color); }
        .loss { color: var(--loss-color); }
        .progress-bar { width: 100%; background-color: var(--progress-bg); border-radius: 9999px; height: 8px; margin-top: 8px; overflow: hidden; display: flex; }
        .progress-win { background-color: var(--win-color); height: 100%; }
        .progress-draw { background-color: var(--draw-color); height: 100%; }
        .progress-loss { background-color: var(--loss-color); height: 100%; }
        .score-container { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 8px 0; }
        .score { font-size: 30px; font-weight: 900; color: var(--score-color); }
        .bottom { text-align: right; font-size: 12px; margin-top: 4px; opacity: 0.8; padding-right: 4px; color: var(--text-gray); }
      </style>
      <div class="card">
        <header class="header">
          <div class="game-name">${gameName}</div>${stats.score ? `
          <div class="score-label">最高得分</div>` : ''}
        </header>${!stats.score ? `
        <div class="stats">
          <span class="win">胜: ${stats.wins}</span>
          <span class="draw">平: ${stats.draws}</span>
          <span class="loss">负: ${stats.losses}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-win" style="width: ${winPercent}%;"></div>
          <div class="progress-draw" style="width: ${drawPercent}%;"></div>
          <div class="progress-loss" style="width: ${lossPercent}%;"></div>
        </div>` : `
        <div class="score-container">
          <div class="score">${stats.score}</div>
        </div>`}
        <div class="bottom">游玩次数：${stats.total}</div>
      </div>
      <div class="bottom">@${username}</div>
    `;
    } else {
      htmlContent = `
      <style>
        :root {
          --bg-color: ${bgColor};
          --text-gray: ${textGray};
        }
        .no-data { background-color: var(--bg-color); border-radius: 8px; padding: 16px; width: 368px; height: 168px; font-family: system-ui, -apple-system, sans-serif; box-sizing: border-box; display: flex; align-items: center; justify-content: center; }
        .no-data-text { text-align: center; color: var(--text-gray); }
      </style>
      <div class="no-data">
        <div class="no-data-text">未找到 ${username} 在 ${gameName} 中的战绩</div>
      </div>
    `;
    }
    const svg = `<svg width="360" height="168" xmlns="http://www.w3.org/2000/svg">
  <foreignObject x="0" y="0" width="360" height="168">
    <html xmlns="http://www.w3.org/1999/xhtml">${htmlContent}</html>
  </foreignObject>
</svg>`;
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.send(svg);
  } catch (error) {
    console.error(error);
    const errorSvg = `<svg width="360" height="168" xmlns="http://www.w3.org/2000/svg">
  <foreignObject x="0" y="0" width="360" height="168">
    <html xmlns="http://www.w3.org/1999/xhtml">
      <style>
        :root {
          --error-color: ${errorColor};
        }
        .error { color: var(--error-color); text-align: center; padding: 20px; width: 360px; height: 168px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; }
      </style>
      <div class="error">服务器错误</div>
    </html>
  </foreignObject>
</svg>`;
    res.status(500).send(errorSvg);
  }
});

export default router;
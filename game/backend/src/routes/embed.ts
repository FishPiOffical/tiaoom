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

router.get('/:username/:game', async (req: Request, res: Response) => {
  const { username, game } = req.params;

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
          .card { background-color: #f3f4f6; border-radius: 8px; padding: 16px; font-family: system-ui, -apple-system, sans-serif; box-sizing: border-box; }
          .header { display: flex; justify-content: space-between; align-items: baseline; }
          .game-name { font-size: 14px; font-weight: bold; margin-bottom: 4px; }
          .score-label { font-size: 12px; opacity: 0.6; }
          .stats { display: flex; justify-content: space-between; font-size: 12px; }
          .win { color: #16a34a; }
          .draw { color: #ca8a04; }
          .loss { color: #dc2626; }
          .progress-bar { width: 100%; background-color: #e5e7eb; border-radius: 9999px; height: 8px; margin-top: 8px; overflow: hidden; display: flex; }
          .progress-win { background-color: #16a34a; height: 100%; }
          .progress-draw { background-color: #ca8a04; height: 100%; }
          .progress-loss { background-color: #dc2626; height: 100%; }
          .score-container { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 8px 0; }
          .score { font-size: 30px; font-weight: 900; color: #06b6d4; }
          .bottom { text-align: right; font-size: 12px; margin-top: 4px; opacity: 0.6; padding-right: 4px; }
        </style>
        <div class="card">
          <header class="header">
            <div class="game-name">${gameName}</div>
            ${stats.score ? '<div class="score-label">最高得分</div>' : ''}
          </header>
          ${!stats.score ? `
            <div class="stats">
              <span class="win">胜: ${stats.wins}</span>
              <span class="draw">平: ${stats.draws}</span>
              <span class="loss">负: ${stats.losses}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-win" style="width: ${winPercent}%;"></div>
              <div class="progress-draw" style="width: ${drawPercent}%;"></div>
              <div class="progress-loss" style="width: ${lossPercent}%;"></div>
            </div>
          ` : `
            <div class="score-container">
              <div class="score">${stats.score}</div>
            </div>
          `}
          <div class="bottom">游玩次数：${stats.total}</div>
        </div>
        <div class="bottom">@${username}</div>
      `;
    } else {
      htmlContent = `
        <style>
          .no-data { background-color: #f3f4f6; border-radius: 8px; padding: 16px; font-family: system-ui, -apple-system, sans-serif; box-sizing: border-box; display: flex; align-items: center; justify-content: center; }
          .no-data-text { text-align: center; color: #6b7280; }
        </style>
        <div class="no-data">
          <div class="no-data-text">未找到 ${username} 在 ${gameName} 中的战绩</div>
        </div>
      `;
    }
    const svg = `
      <svg width="400" height="168" xmlns="http://www.w3.org/2000/svg">
        <foreignObject x="0" y="0" width="400" height="168">
          <html xmlns="http://www.w3.org/1999/xhtml">
            ${htmlContent}
          </html>
        </foreignObject>
      </svg>
    `;
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.send(svg);
  } catch (error) {
    console.error(error);
    const errorSvg = `
      <svg width="400" height="168" xmlns="http://www.w3.org/2000/svg">
        <foreignObject x="0" y="0" width="400" height="168">
          <html xmlns="http://www.w3.org/1999/xhtml">
            <style>
              .error { color: red; text-align: center; padding: 20px; width: 400px; height: 168px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; }
            </style>
            <div class="error">服务器错误</div>
          </html>
        </foreignObject>
      </svg>
    `;
    res.status(500).send(errorSvg);
  }
});

export default router;
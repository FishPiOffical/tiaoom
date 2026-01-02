import fs from 'fs';
import path from "path";
import { isObject } from './is';
import { IConfig } from '#/index';
import { Request } from 'express';
import { Finger, FingerTo, FishPi } from 'fishpi';
import utils from './index';
import { LogRepo } from '@/entities';

export * from './data';

/**
 * 返回一个对象，剔除指定的键
 * @param obj 对象
 * @param keys key 列表
 * @returns 
 */
export function omit(obj: any, keys: string[]) {
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => !keys.includes(key))
  );
}

/**
 * 返回一个对象，只包含指定的键
 * @param obj 对象
 * @param keys key 列表
 * @returns 
 */
export function pick(obj: any, keys: string[]) {
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => keys.includes(key))
  );
}

let cfg: IConfig | null = null
const configPath = path.join(__dirname, '..', 'config.json');

export default {
  get config(): IConfig {
    if (!cfg && fs.existsSync(configPath)) {
      cfg = JSON.parse(fs.readFileSync(configPath).toString());
    }
    return JSON.parse(JSON.stringify(cfg));
  }
}

export function clone<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => clone(item)) as unknown as T;
  }
  if (isObject(value)) {
    const target: any = {};
    for (const key in value) {
      target[key] = clone(value[key]);
    }
    return target;
  }
  return value;
}

export function shortTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  const remainingSeconds = seconds % 60;

  let time = '';
  if (days > 0) time += `${days} 天 `;
  if (hours > 0) time += `${hours} 小时 `;
  if (minutes > 0) time += `${minutes} 分钟 `;
  if (remainingSeconds >= 0) time += `${remainingSeconds} 秒`;

  return time.trim();
}

export function srand(seed: number) {
    function rnd(){
        seed = ( seed * 9301 + 49297 ) % 233280;
        return seed / ( 233280.0 );
    }
    return function(max: number) { 
        const r = Math.floor(rnd() * max); 
        return r;
    }
}

export const random = (max: number, min = 0) => Math.floor(Math.random() * (max - min)) + min;

export const weightedRandom = (min: number, max: number, weight: number): number => {
  const rnd = Math.random();
  const biased = Math.pow(rnd, 1 - weight);
  return Math.floor(min + biased * (max - min));
}

export function getIP(req: Request) {
  return req.header('x-forwarded-for') || req.header('x-real-ip') || req.socket.remoteAddress || req.ip || '';
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let pointFinger: Finger | null = null;
export async function setPoints(value: number, username: string, reason: string) {
  if (!pointFinger) {
    pointFinger = FingerTo(utils.config.secret.goldenKey);
  }
  pointFinger.editUserPoints(username, value, reason).catch((err) => {
    console.error('积分操作失败：', err.message, username, '积分', value, '原因', reason);
    LogRepo().save(LogRepo().create({
      type: 'PointError',
      data: { username, value, reason },
      error: { message: err.message },
    })).catch(console.error);
  });
}
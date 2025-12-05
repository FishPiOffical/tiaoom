import { Room } from 'tiaoom';
import * as glob from 'glob';
import * as path from "path";
const files = glob.sync(path.join(__dirname, '*.*').replace(/\\/g, '/')).filter(f => f.endsWith('.ts') || f.endsWith('.js'));

export interface IGame extends IGameInfo {
  default: (room: Room) => any;
}

export interface IGameInfo {
  name: string;
  minSize: number;
  maxSize: number;
  description: string;
}

export type GameMap = { [key: string]: IGame };

const games :GameMap = {};
files.forEach(async (file) => {
  const name = path.basename(file.replace(/\.(ts|js)$/, ''));
  if (name == 'index') return;
  file = './' + name;
  const game = await import(file);
  if (!game) return;
  games[name] = game;
});

export default games;
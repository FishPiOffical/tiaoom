import { Room } from '@lib/index';
import * as glob from 'glob';
import * as path from "path";
const files = glob.sync(path.join(__dirname, '*.ts').replace(/\\/g, '/'));

export type GameMap = { [key: string]: (room: Room) => any };

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
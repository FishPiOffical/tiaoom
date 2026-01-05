import path from "path";
import fs from "fs";

export const configPath = path.join(__dirname, '..', 'config.json');

export function isConfigured(): boolean {
  return fs.existsSync(configPath);
}
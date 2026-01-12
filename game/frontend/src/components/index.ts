import { defineAsyncComponent } from 'vue';
import type { App, Component } from 'vue';
import type { Player, RoomPlayer } from 'tiaoom/client';

const commonModules = import.meta.glob('./common/*.vue', { eager: true });
const otherModules = import.meta.glob(['./*/*.vue', '!./common/*.vue']);

export const components: Record<string, Component> = {};

for (const path in commonModules) {
  const p = path.split('/').pop()?.replace(/\.(vue)$/, '');
  if (p) components[p] = (commonModules[path] as { default: Component }).default;
}

for (const path in otherModules) {
  const p = path.split('/').pop()?.replace(/\.(vue)$/, '');
  if (p) components[p] = defineAsyncComponent(otherModules[path] as any);
}

export function registerGameComponents(app: App) {
  for (const path in commonModules) {
    const name = path.split('/').pop()?.replace(/\.(vue)$/, '');
    if (name) {
      app.component(name, components[name])
    }
  }
}

export function getComponent(game: string | undefined, type: string) {
  if (!game) return null
  return components[game.split('-').map(t => t.slice(0, 1).toUpperCase() + t.slice(1)).join('') + type]
}

export interface IMessage {
  content: string;
  sender?: Player | RoomPlayer;
}
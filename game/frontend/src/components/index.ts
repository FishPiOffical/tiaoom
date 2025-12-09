import type { App, Component } from 'vue'
import type { Player } from 'tiaoom/client';

const modules = import.meta.glob('./*/*.vue', { eager: true });
const components: Record<string, Component> = {};
for (const path in modules) {
  const p = path.split('/').pop()?.replace(/\.(vue)$/, '');
  if (p) components[p] = (modules[path] as { default: Component }).default ;
}

export function registerGameComponents(app: App) {
  for (const [name, component] of Object.entries(components)) {
    app.component(name, component)
  }
}

export interface IMessage {
  content: string;
  sender?: Player;
}
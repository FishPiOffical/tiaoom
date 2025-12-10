import { GameCore } from "@/core/game";
import { TiaoomEvents } from "tiaoom/client";
import { onBeforeUnmount } from "vue";

export function useGameEvents(game: GameCore, onListenerMap: Partial<TiaoomEvents>) {
  for (const event in onListenerMap) {
    const handle = onListenerMap[event as keyof TiaoomEvents] as (...args: any[]) => void;
    game.on(event as keyof TiaoomEvents, handle);
  }

  onBeforeUnmount(() => {
    for (const event in onListenerMap) {
      const handle = onListenerMap[event as keyof TiaoomEvents] as (...args: any[]) => void;
      game.off(event as keyof TiaoomEvents, handle);
    }
  });
}
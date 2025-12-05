import 'express-session';

declare module 'express-session' {
  interface SessionData {
    error: string;
    player: { id: string, name: string, avatar?: string };
  }
}
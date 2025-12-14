import type { User } from '@/entities';
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    error: string;
    player: User;
  }
}
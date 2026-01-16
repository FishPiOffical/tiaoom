import { User } from '@/entities/User';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      playground?: Playground;
    }
  }
}

interface IConfig {
  webport: number;
  secret: {
    identity: string;
    session: string;
    goldenKey: string;
    marketKey: string;
  };
  database: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    entityPrefix?: string;
  };
  persistence?: {
    driver: 'none' | 'mysql' | 'redis' | 'mongodb';
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    database?: string;
    prefix?: string;
  };
  login: {
    githubClientId?: string;
    githubClientSecret?: string;
    steamApiKey?: string;
  }
}

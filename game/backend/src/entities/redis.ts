import { createClient } from 'redis';
import utils from '@/utils';

export const redisClient = (utils.config && utils.config.persistence?.driver === 'redis') ? createClient({
  url: `redis://${utils.config.persistence.password ? `:${encodeURIComponent(utils.config.persistence.password)}@` : ''}${utils.config.persistence.host || 'localhost'}:${utils.config.persistence.port || 6379}`,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 20) {
        console.error('Redis reconnection retries exhausted');
        return new Error('Redis reconnection retries exhausted');
      }
      return Math.min(retries * 100, 3000);
    }
  }
}) : null;

if (redisClient) {
  redisClient.on('error', (err) => console.error('Redis Client Error', err));
  redisClient.on('connect', () => console.log('Redis Client Connected'));
  redisClient.on('reconnecting', () => console.log('Redis Client Reconnecting...'));
}

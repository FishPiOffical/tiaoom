import 'reflect-metadata';
import { EventSubscriber, EntitySubscriberInterface, InsertEvent, UpdateEvent, DataSource, Repository } from 'typeorm';
import { User } from "./User";
import { RoomSQL, RoomMongo, Room } from "./Room";
import { Log } from "./Log";
import { Record } from "./Record";
import { PlayerStats } from "./PlayerStats";
import utils from '@/utils'

@EventSubscriber()
export class EntitySubscriber implements EntitySubscriberInterface {
  beforeInsert(event: InsertEvent<any>): void {
    if (event.entity && !event.entity.createdAt) {
      const timestamp = Date.now();
      if ('createdAt' in event.entity) {
        event.entity.createdAt = timestamp;
      }
      if ('updatedAt' in event.entity) {
        event.entity.updatedAt = timestamp;
      }
    }
  }

  beforeUpdate(event: UpdateEvent<any>): void {
    if (event.entity && 'updateTime' in event.entity) {
      event.entity.updateTime = Date.now();
    }
  }
}

export const AppDataSource = utils.config ? new DataSource({
  type: "mysql",
  logging: false,
  ...utils.config.database,
  synchronize: true,
  entities: [User, Log, Record, PlayerStats, ...(utils.config.persistence?.driver == 'mysql' ? [RoomSQL] : [])],
  migrations: [],
  subscribers: [],
  charset: "utf8mb4_unicode_ci"
}) : {} as DataSource;

export {
  User,
  Room,
  RoomSQL,
  RoomMongo,
  Log,
  Record,
  PlayerStats,
}

export * from './mongo';
export * from './redis';

export const UserRepo = utils.config ? AppDataSource.getRepository(User) : {} as Repository<User>;
export const LogRepo = utils.config ? AppDataSource.getRepository(Log) : {} as Repository<Log>;
export const RecordRepo = utils.config ? AppDataSource.getRepository(Record) : {} as Repository<Record>;
export const RoomRepo = utils.config && utils.config.persistence?.driver == 'mysql' ? AppDataSource.getRepository(RoomSQL) : {} as any;
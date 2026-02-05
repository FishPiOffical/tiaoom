import 'reflect-metadata';
import { gameLoaded } from '@/games';
import { EventSubscriber, EntitySubscriberInterface, InsertEvent, UpdateEvent, DataSource, Repository, getMetadataArgsStorage, EntityTarget } from 'typeorm';
import { User } from "./User";
import { RoomSQL, RoomMongo, Room } from "./Room";
import { Log } from "./Log";
import { Record } from "./Record";
import { PlayerStats } from "./PlayerStats";
import utils from '@/utils'
import { Manage } from './Manage';
import { UserBind } from './UserBind';

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

async function getGameDatas() {
  const metadata = getMetadataArgsStorage();
  const Games = await gameLoaded;
  return Object.keys(Games).filter(g => (Games[g] as any).Model).map(g => {
    const Model = (Games[g] as any).Model;
    const tableMetadata = metadata.tables.find(table => table.target === Model);
    if (tableMetadata && !tableMetadata.name?.startsWith(g)) {
      tableMetadata.name = g + '_' + tableMetadata.name; // 修改表名
    }
    return Model;
  });
}

export let AppDataSource = {} as DataSource;

const initDataSource = (async () => {
  AppDataSource = utils.config ? new DataSource({
    type: "mysql",
    logging: false,
    ...utils.config.database,
    synchronize: true,
    entities: [User, UserBind, Log, Record, PlayerStats, Manage, ...await getGameDatas(), ...(utils.config.persistence?.driver == 'mysql' ? [RoomSQL] : [])],
    migrations: [],
    subscribers: [],
    charset: "utf8mb4_unicode_ci"
  }) : {} as DataSource;
  return AppDataSource;
})();

export { initDataSource };

export {
  User,
  UserBind,
  Room,
  Manage,
  RoomSQL,
  RoomMongo,
  Log,
  Record,
  PlayerStats,
}

export * from './mongo';
export * from './redis';
  
export const UserRepo = () => utils.config ? AppDataSource.getRepository(User) : {} as Repository<User>;
export const UserBindRepo = () => utils.config ? AppDataSource.getRepository(UserBind) : {} as Repository<UserBind>;
export const LogRepo = () => utils.config ? AppDataSource.getRepository(Log) : {} as Repository<Log>;
export const RecordRepo = () => utils.config ? AppDataSource.getRepository(Record) : {} as Repository<Record>;
export const ManageRepo = () => utils.config ? AppDataSource.getRepository(Manage) : {} as Repository<Manage>;
export const StatsRepo = () => utils.config ? AppDataSource.getRepository(PlayerStats) : {} as Repository<PlayerStats>;
export const RoomRepo = () => utils.config && utils.config.persistence?.driver == 'mysql' ? AppDataSource.getRepository(RoomSQL) : {} as any;
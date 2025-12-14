import 'reflect-metadata';
import { EventSubscriber, EntitySubscriberInterface, InsertEvent, UpdateEvent, DataSource, Repository } from 'typeorm';
import { User } from "./User";
import { Room } from "./Room";
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
  entities: [User, Room],
  migrations: [],
  subscribers: [],
  charset: "utf8mb4_unicode_ci"
}) : {} as DataSource;

export {
  User,
  Room
}

export const UserRepo = utils.config ? AppDataSource.getRepository(User) : {} as Repository<User>;
export const RoomRepo = utils.config ? AppDataSource.getRepository(Room) : {} as Repository<Room>;

import 'reflect-metadata';
import { EventSubscriber, EntitySubscriberInterface, InsertEvent, UpdateEvent, DataSource, Repository } from 'typeorm';
import { User } from "./User";
import utils from '@/utils'

@EventSubscriber()
export class EntitySubscriber implements EntitySubscriberInterface {
  beforeInsert(event: InsertEvent<any>): void {
    if (event.entity) {
      const timestamp = Date.now();
      if ('createTime' in event.entity) {
        event.entity.createTime = timestamp;
      }
      if ('updateTime' in event.entity) {
        event.entity.updateTime = timestamp;
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
  entities: [User],
  migrations: [],
  subscribers: [],
  charset: "utf8mb4_unicode_ci"
}) : {} as DataSource;

export {
  User
}

export const UserRepo = utils.config ? AppDataSource.getRepository(User) : {} as Repository<User>;

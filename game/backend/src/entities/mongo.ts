import { DataSource } from 'typeorm';
import { RoomMongo } from "./Room";
import utils from '@/utils';

export const MongoDataSource = (utils.config && utils.config.persistence?.driver === 'mongodb') ? new DataSource({
  type: "mongodb",
  host: utils.config.persistence.host || 'localhost',
  port: utils.config.persistence.port || 27017,
  username: utils.config.persistence.username,
  password: utils.config.persistence.password,
  database: utils.config.persistence.database || 'tiaoom',
  synchronize: true,
  logging: false,
  entities: [RoomMongo],
  entityPrefix: utils.config.persistence.prefix
}) : {} as DataSource;

export const MongoRoomRepo = (utils.config && utils.config.persistence?.driver === 'mongodb') ? MongoDataSource.getMongoRepository(RoomMongo) : {} as any;

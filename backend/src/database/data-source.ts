import { config } from 'dotenv';
import { DataSource } from 'typeorm';

import { RoomMessage } from '../chat/room-message.entity';
import { Participant } from '../participants/participant.entity';
import { Room } from '../rooms/room.entity';
import { User } from '../users/user.entity';

config();

const booleanEnv = (value: string | undefined): boolean => value === 'true';
const isCompiled = __filename.endsWith('.js');

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 5432),
  username: process.env.DATABASE_USER ?? 'weblive',
  password: process.env.DATABASE_PASSWORD ?? 'weblive_dev_password',
  database: process.env.DATABASE_NAME ?? 'weblive2026',
  entities: [User, Room, Participant, RoomMessage],
  migrations: [
    isCompiled
      ? 'dist/database/migrations/*.js'
      : 'src/database/migrations/*.ts',
  ],
  synchronize: false,
  ssl: booleanEnv(process.env.DATABASE_SSL)
    ? { rejectUnauthorized: false }
    : false,
});

export default AppDataSource;

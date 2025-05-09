// data-source.ts
import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { SeederOptions } from 'typeorm-extension';

// 엔티티 임포트 (NestJS 코드 구조에 따라 경로 조정)
import { PostsModel } from './src/posts/entity/posts.entity';
import { UsersModel } from './src/users/entity/users.entity';
import { ImageModel } from './src/common/entity/image.entity';
import { ChatsModel } from './src/chats/entity/chats.entity';
import { MessagesModel } from './src/chats/messages/entity/messages.entity';
import { CommentsModel } from './src/posts/comments/entity/comments.entity';
import { UserFollowersModel } from './src/users/entity/user-followers.entity';

const options: DataSourceOptions & SeederOptions = {
  type: 'postgres',
  host: process.env.DB_HOST     || 'localhost',
  port: Number(process.env.DB_PORT)     || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'postgres',

  synchronize: true,

  entities: [
    PostsModel,
    UsersModel,
    ImageModel,
    ChatsModel,
    MessagesModel,
    CommentsModel,
    UserFollowersModel,
  ],

  // 시더(Seeder)와 팩토리(Factory) 위치 지정
  seeds:    ['src/database/seeds/**/*{.ts,.js}'],
  factories:['src/database/factories/**/*{.ts,.js}'],
};

export default new DataSource(options);
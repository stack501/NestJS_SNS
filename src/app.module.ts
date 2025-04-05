import { ClassSerializerInterceptor, MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PostsModule } from './posts/posts.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostsModel } from './posts/entity/posts.entity';
import { UsersModule } from './users/users.module';
import { UsersModel } from './users/entity/users.entity';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { PUBLIC_FOLDER_PATH } from './common/const/path.const';
import { ImageModel } from './common/entity/image.entity';
import { LogMiddleware } from './common/middleware/log.middleware';
import { ChatsModule } from './chats/chats.module';
import { ChatsModel } from './chats/entity/chats.entity';
import { MessagesModel } from './chats/messages/entity/messages.entity';
import { CommentsModel } from './posts/comments/entity/comments.entity';
import { CommentsModule } from './posts/comments/comments.module';
import { RolesGuard } from './users/guard/roles.guard';
import { AccessTokenGuard } from './auth/guard/bearer-token.guard';
import { UserFollowersModel } from './users/entity/user-followers.entity';
import appConfig from './configs/app.config';
import dbConfig from './configs/db.config';

@Module({
  imports: [
    PostsModule,
    ServeStaticModule.forRoot({
      // xxx.jpg
      // rootPath만 있을 시 -> http://localhost:3000/posts/xxx.jpg
      rootPath: PUBLIC_FOLDER_PATH,
      // serveRoot를 추가 시 -> http://localhost:3000/public/posts/xxx.jpg
      serveRoot: '/public',
    }),
    ConfigModule.forRoot({
      isGlobal: true, // 전체적으로 사용하기 위해
      envFilePath: `src/configs/env/.${process.env.NODE_ENV}.env`,
      load: [appConfig, dbConfig],
    }),
    // TypeOrmModule을 ConfigService를 통해 동적으로 설정합니다.
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          type: 'postgres',
          host: configService.get<string>('db.host'),
          port: configService.get<number>('db.port'),
          username: configService.get<string>('db.username'),
          password: configService.get<string>('db.password'),
          database: configService.get<string>('db.database'),
          entities: [
            PostsModel,
            UsersModel,
            ImageModel,
            ChatsModel,
            MessagesModel,
            CommentsModel,
            UserFollowersModel,
          ],
          synchronize: true,
        };
      },
    }),
    UsersModule,
    AuthModule,
    CommonModule,
    ChatsModule,
    CommentsModule,
  ],
  controllers: [AppController],
  providers: [AppService, {
    provide: APP_INTERCEPTOR,
    useClass: ClassSerializerInterceptor,
  },
  {
    provide: APP_GUARD,
    useClass: AccessTokenGuard,
  },
  {
    provide: APP_GUARD,
    useClass: RolesGuard,
  }
],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(
      LogMiddleware,
    ).forRoutes({
      path: '*',
      method: RequestMethod.ALL,
    });
  }
}

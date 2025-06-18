import { ClassSerializerInterceptor, Module } from '@nestjs/common';
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
// import { LogMiddleware } from './common/middleware/log.middleware';
import { ChatsModule } from './chats/chats.module';
import { ChatsModel } from './chats/entity/chats.entity';
import { MessagesModel } from './chats/messages/entity/messages.entity';
import { CommentsModel } from './posts/comments/entity/comments.entity';
import { CommentsModule } from './posts/comments/comments.module';
import { RolesGuard } from './users/guard/roles.guard';
import { AccessTokenGuard } from './auth/guard/bearer-token.guard';
import { UserFollowersModel } from './users/entity/user-followers.entity';
import { RedisModule } from './redis/redis.module';
import appConfig from './configs/app.config';
import dbConfig from './configs/db.config';
import { LogInterceptor } from './common/interceptor/log.interceptor';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import depthLimit from 'graphql-depth-limit';
import { createComplexityRule, directiveEstimator, simpleEstimator } from 'graphql-query-complexity';
import { GraphQLError } from 'graphql';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './common/logger/winston.config';
import { HealthModule } from './health/health.module';


@Module({
  imports: [
    WinstonModule.forRoot(winstonConfig),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'dist/schema.gql'), // 스키마 파일 생성 경로
      sortSchema: true, // 스키마를 알파벳 순으로 정렬 (선택 사항)
      playground: true, // 개발 환경에서 GraphQL Playground 활성화
      debug: true, // 개발 환경에서 디버그 정보 활성화
      validationRules: [
        // 1) 최대 깊이 제한 (optional)
        depthLimit(5),

        // 2) 쿼리 복잡도 제한
        createComplexityRule({
          estimators: [
            // (1) directive-based estimation: @complexity(value) 사용 시
            directiveEstimator(),
            // (2) 기본 필드당 1점
            simpleEstimator({ defaultComplexity: 1 }),
          ],
    
          // 최대 허용 복잡도
          maximumComplexity: 100,
    
          // 실행 후 콜백
          onComplete: (complexity: number) => {
            console.log('💡 GraphQL query complexity:', complexity);
          },
    
          // 초과 시 던질 에러
          createError: (max: number, actual: number) =>
            new GraphQLError(
              `Query is too complex: ${actual}. Maximum allowed complexity: ${max}`,
              { extensions: { code: 'GRAPHQL_COMPLEXITY_LIMIT' } },
            ),
        }),
      ],
    }),
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
        const isDevelopment = process.env.NODE_ENV === 'dev'; // 개발 환경인지 확인

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
          // synchronize: true,
          synchronize: configService.get<boolean>('db.synchronize', true),

          // --- 로깅 설정 추가 ---
          // NODE_ENV가 'development'일 때만 상세 로깅을 활성화하거나, ConfigService를 통해 로깅 레벨을 관리할 수 있습니다.
          logging: isDevelopment ? ['query', 'error'] : ['error'], // 개발 환경에서는 쿼리와 에러 로깅, 그 외에는 에러만 로깅
          // logging: configService.get('db.loggingLevel', ['query', 'error']), // ConfigService에서 로깅 레벨을 가져올 수도 있습니다.
          logger: 'advanced-console', // 또는 'simple-console'
          maxQueryExecutionTime: 1000, // (선택 사항) 1초 이상 소요되는 쿼리 경고 (TypeORM 0.3.0 이상)
          // --- 로깅 설정 끝 ---
        };
      },
    }),
    UsersModule,
    AuthModule,
    CommonModule,
    ChatsModule,
    CommentsModule,
    RedisModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService, 
  {
    provide: APP_INTERCEPTOR,
    useClass: LogInterceptor,
  },
  {
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
// export class AppModule implements NestModule {
//   configure(consumer: MiddlewareConsumer) {
//     consumer.apply(
//       LogMiddleware,
//     ).forRoutes({
//       path: '*',
//       method: RequestMethod.ALL,
//     });
//   }
// }

export class AppModule {}

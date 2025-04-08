import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import expressBasicAuth from 'express-basic-auth';
import { ConfigService } from '@nestjs/config';
import { AuthScheme } from './common/const/auth-schema.const';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const swaggerUser = configService.get<string>('app.swagger.user');
  const swaggerPassword = configService.get<string>('app.swagger.password');
  if (!swaggerUser || !swaggerPassword) {
    throw new Error('Swagger credentials are not defined');
  }

  app.use(
    '/api',
    expressBasicAuth({
      challenge: true,
      users: {
        [swaggerUser]: swaggerPassword, // 지정된 ID/비밀번호
      },
    }),
  );

  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  const config = new DocumentBuilder()
    .setTitle('NestJS SNS 프로젝트')
    .setDescription('NestJS SNS API description')
    .setVersion('0.0.1')
    // "access" 이름의 AccessToken 스키마
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    },
    AuthScheme.ACCESS,
  )
  // "refresh" 이름의 RefreshToken 스키마
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    },
    AuthScheme.REFRESH,
  )
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api', app, documentFactory, {
  	swaggerOptions: {
      persistAuthorization: true, // Swagger에서 저장된 Bearer Token이 날아가지 않게 해줌(편의성)
    }
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

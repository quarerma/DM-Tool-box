import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import * as express from 'express';

import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const frontendUrl = configService.get<string>('FRONTEND_URL');
  const allowedOrigins = [frontendUrl].filter(Boolean) as string[];

  app
    .getHttpAdapter()
    .getInstance()
    .use((req: any, _res: any, next: any) => {
      req.ja3 = String(req.headers['x-ja3'] ?? '').trim();
      req.clientPlatform = String(req.headers['sec-ch-ua-platform'] ?? '')
        .replace(/"/g, '')
        .trim();
      next();
    });

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (configService.get('NODE_ENV') === 'development') {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  });

  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.getHttpAdapter().getInstance().set('query parser', 'extended');

  const shutdown = async (signal: string) => {
    logger.log(`Received ${signal}, shutting down...`);
    try {
      await app.close();
      logger.log('Application closed');
    } catch (error) {
      logger.error('Error during shutdown', error as Error);
    }
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  process.env.TZ = 'UTC';
  const port = configService.get<number>('PORT') ?? 3000;
  await app.listen(port);
  logger.log(`Server started on port ${port}`);
}

void bootstrap();

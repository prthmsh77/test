import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: process.env.NODE_ENV !== 'production' }),
  );

  // Global validation pipe: strips unknown fields, auto-transforms plain objects
  // to class instances so class-validator decorators work.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api/v1');

  // OpenAPI docs at /api/docs — disabled in production.
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Shikhar API')
      .setDescription("India's Trekking Social + Safety Platform")
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // CORS: allow the web live-track app and the mobile app's localhost in dev.
  app.enableCors({
    origin:
      process.env.CORS_ORIGINS?.split(',') ||
      ['http://localhost:3001', 'http://localhost:19006'],
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`[api] Shikhar API running on port ${port}`);
}

bootstrap().catch((err) => {
  console.error('[api] Bootstrap failed:', err);
  process.exit(1);
});

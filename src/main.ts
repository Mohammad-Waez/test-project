import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'node:path'
import express from 'express';
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });

console.log('Uploads path:', join(process.cwd(), 'uploads'));


app.use(
  '/uploads',
  express.static(join(process.cwd(), 'uploads')),
);



  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

 // app.setGlobalPrefix('api');

  await app.listen(process.env.PORT ?? 4000);
}
await bootstrap();

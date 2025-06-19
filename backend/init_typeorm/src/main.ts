// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Configuración de CORS (se mantiene igual)
  app.enableCors({
    origin: 'http://localhost:4200',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Origin,X-Requested-With,Content-Type,Accept,Authorization',
  });

  // 2. Configuración de Swagger (¡NUEVO!)
  const swaggerConfig = new DocumentBuilder()
    .setTitle('API de Restaurantes')
    .setDescription('Sistema de gestión de restaurantes y menús')
    .setVersion('1.0')
    .addBearerAuth( // Autenticación JWT (si usas JwtAuthGuard)
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT-auth' // Nombre de la estrategia (debe coincidir con el guard)
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document); // Ruta: http://localhost:3000/api/docs

  // 3. Validación global (se mantiene igual)
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true
    }
  }));

  await app.listen(3000);
}
bootstrap();
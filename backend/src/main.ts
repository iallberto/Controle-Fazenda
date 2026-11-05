import { NestFactory, Reflector } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, ClassSerializerInterceptor, INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Em produção o Caddy fica na frente: o endereço real de quem acessa vem no
  // cabeçalho do proxy (spec 007, R8). Só com TRUST_PROXY ligado, para ninguém
  // forjar o endereço quando o backend estiver exposto direto (desenvolvimento).
  if (process.env.TRUST_PROXY === '1') {
    app.set('trust proxy', 1);
  }

  const origensPermitidas = (
    process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:8080'
  ).split(',');
  app.enableCors({ origin: origensPermitidas.map((origem) => origem.trim()) });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  if (process.env.SWAGGER_ENABLED !== 'false') {
    configurarSwagger(app);
  }

  await app.listen(process.env.PORT ?? 3000);
}

function configurarSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Controle Fazenda API')
    .setDescription('API para controle do ciclo reprodutivo de gado de corte')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
}
void bootstrap();
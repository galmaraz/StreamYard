import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { existsSync, readFileSync } from 'node:fs';

import { AppModule } from './app.module';
import { isAllowedCorsOrigin } from './shared/config/cors-origin';

function getHttpsOptions():
  | {
      key: Buffer;
      cert: Buffer;
    }
  | undefined {
  if (process.env.HTTPS_ENABLED !== 'true') {
    return undefined;
  }

  const keyPath = process.env.HTTPS_KEY_PATH ?? '../certs/local-key.pem';
  const certPath = process.env.HTTPS_CERT_PATH ?? '../certs/local-cert.pem';

  if (!existsSync(keyPath) || !existsSync(certPath)) {
    throw new Error(
      `HTTPS local requiere certificados. Ejecuta desde la raiz: ./scripts/create-local-cert.sh <IP_LOCAL>. Archivos esperados: ${keyPath} y ${certPath}`,
    );
  }

  return {
    key: readFileSync(keyPath),
    cert: readFileSync(certPath),
  };
}

async function bootstrap(): Promise<void> {
  const httpsOptions = getHttpsOptions();
  const app = await NestFactory.create(
    AppModule,
    httpsOptions ? { httpsOptions } : undefined,
  );
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') ?? 3000;
  const host = configService.get<string>('HOST') ?? '0.0.0.0';

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      if (isAllowedCorsOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS origin not allowed: ${origin}`));
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(port, host);
}

void bootstrap();

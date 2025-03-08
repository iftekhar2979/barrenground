import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ValidationExceptionFilter } from './common/filters/validationError';
import { ResponseInterceptor } from './common/interceptors/response.interceptors';
import { LoggingInterceptor } from './common/interceptors/logging.interceptors';
import { MongoDuplicateKeyExceptionFilter } from './common/filters/duplicateFilter';
import { UnauthorizedExceptionFilter } from './common/filters/unAuthorizedExectionError';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SeederService } from './seed/seedService';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, 
      whitelist: true, 
      forbidNonWhitelisted: true, 
    }),
  );
  const seederService = app.get(SeederService);
  await seederService.seedData()
    await seederService.seedAdminUser();
    app.enableCors({
      origin:"*",
      methods:"GET,PUT,POST,PATCH,DELETE",
    allowedHeaders:"Content-Type, Authorization"
    })
  app.useGlobalFilters(new MongoDuplicateKeyExceptionFilter());
  app.useGlobalFilters(new ValidationExceptionFilter());
  app.useGlobalFilters(new UnauthorizedExceptionFilter());
  app.useStaticAssets(join(__dirname, '..', 'public'));
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalInterceptors(new LoggingInterceptor());
//  const socketService = app.get(SocketService)
  await app.listen(process.env.PORT ?? 8080);
}
bootstrap();

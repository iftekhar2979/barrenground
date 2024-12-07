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

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Configure global validation (for DTOs, for example)
  // app.useGlobalPipes(new ValidationPipe());

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // Automatically transform plain objects into DTOs
      whitelist: true, // Remove properties not in the DTO
      forbidNonWhitelisted: true, // Throws error if unknown properties are passed
    }),
  );
  // Apply global exception filter
  // app.useGlobalFilters(new AllExceptionsFilter());

  app.useGlobalFilters(new MongoDuplicateKeyExceptionFilter());
  app.useGlobalFilters(new ValidationExceptionFilter());
  app.useGlobalFilters(new UnauthorizedExceptionFilter());
   // Serve static files from the public folder
   app.useStaticAssets(join(__dirname, '..', 'public'), { prefix: '/uploads' });
  // app.useGlobalGuards(new JwtAuthGuard());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalInterceptors(new LoggingInterceptor());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

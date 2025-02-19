import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const url = request.url;
    const method = request.method;
    const now = Date.now();
    const bodySize = Buffer.byteLength(JSON.stringify(request.body));

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - now;
        const statusCode = response.statusCode; 
        console.log(
          `${request.headers["user-agent"]} [${method}] ${statusCode} ${url} - Body Size: ${bodySize} bytes - ${responseTime}ms Body : {${JSON.stringify(request.body)}}`,
        );
      }),
      catchError((error) => {
        console.log("ERRRR",error)
        const responseTime = Date.now() - now;
        let statusCode = 500; // Default status code

        if (error instanceof HttpException) {
          statusCode = error.getStatus();
        }

        console.error(
          `${request.headers["user-agent"]} [${method}] ${statusCode} ${url} - Body Size: ${bodySize} bytes - ${responseTime}ms - ERROR: ${error.message}`,
        );

        return throwError(() => error);
      }),
    );
  }
}

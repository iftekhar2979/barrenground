import { pagination } from 'src/common/pagination/pagination';
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
// import { pagination } from '../pagination/pagination';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((data) => {
        response.statusCode = data?.statusCode || 200;
        let message = 'Request was successful';
        if(data?.token){
          return {
            ok: true,
            status:  data?.statusCode || 200 ,
            message: data?.message ? data?.message : message,
            data: data?.pagination || data.data ? data?.data : data || {},
            token:data?.token
          };
        }
        if(data?.pagination){
          return {
            ok: true,
            status:  data?.statusCode || 200,
            message: data?.message ? data?.message : message,
            data: data?.pagination || data.data ? data?.data : data || {},
            pagination: data?.pagination,
          };
        }
        return {
          ok: true,
            status:  data?.statusCode || 200 ,
          message: data?.message ? data?.message : message,
          data: data?.pagination || data.data ? data?.data : data || {},
         
        };
      }),
    );
  }
}

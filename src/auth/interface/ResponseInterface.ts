import { Pagination } from 'src/common/pagination/pagination.interface';
export interface ResponseInterface <T>{
    // ok: boolean;
    message: string;
    data: T;
    statusCode?: number;
    pagination?: Pagination;
}
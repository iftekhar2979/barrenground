import { IsNumberString, IsOptional, IsString } from "class-validator";

export class PaginationDto {
    page: number;
    limit: number;
  
    constructor(page: number = 1, limit: number = 10) {
      this.page = page;
      this.limit = limit;
    }
  }
export class PaginationOptions {
    @IsNumberString()
    page: string;
    @IsNumberString()
    limit: string;
  
    converter(): PaginationDto {
      return new PaginationDto(parseInt(this.page), parseInt(this.limit));
    }
  }

  export class SearchByNameWithPagination extends PaginationOptions {
    @IsOptional()
    term?: string;
    @IsOptional()
    status?: string;
    @IsOptional()
    sortby?: 'accepted' | 'pending' | 'all';
  }
  export class searchTermAndWithinFilter extends PaginationOptions {
    @IsString()
    @IsOptional()
    term?: string;
    @IsString()
    @IsOptional()
    within?: string;
  }
  
  export class ConversationOptions extends PaginationOptions {
    @IsOptional()
    conversationId?: string;
    @IsString()
    type:'pending'|'accepted'
    @IsOptional()
    @IsString()
    term:'pending'|'accepted'
  }
export class MediaOptions extends PaginationOptions{
   @IsString()
    types:'group'|'pending'
}

  export class messagesWithPagination extends PaginationOptions{
    @IsOptional()
    @IsString()
    type?:"group"|"individual" 
  
  }
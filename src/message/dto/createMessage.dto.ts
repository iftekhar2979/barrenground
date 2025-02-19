
import { IsNotEmpty, IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AttachmentDto {
  @IsNotEmpty()
  @IsString()
  fileUrl: string;

  @IsNotEmpty()
  @IsString()
  type: string;
}

export class CreateMessageDto {
  @IsNotEmpty()
  @IsString()
  groupId: string;

  @IsNotEmpty()
  @IsString()
  sender: string; 
  @IsOptional()
  @IsString()
  content?: string;
  @IsOptional()
  @IsString()
  type?: 'text'|'image'|'video';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];
}

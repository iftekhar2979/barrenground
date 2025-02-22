
import { IsNotEmpty, IsOptional, IsString, IsArray, ValidateNested, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';
import { ObjectId } from 'mongoose';

export class AttachmentDto {
  @IsNotEmpty()
  @IsString()
  fileUrl: string;

  @IsNotEmpty()
  @IsString()
  type: string;
}

export class CreateMessageDto {
  @IsOptional()
  @IsString()
  groupId: string;

  @IsMongoId()
  sender: ObjectId; 
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

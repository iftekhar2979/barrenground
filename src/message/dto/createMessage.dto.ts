
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
  @IsMongoId()
  groupId: ObjectId;
  @IsOptional()
  @IsMongoId()
  conversationId: ObjectId;

  @IsMongoId()
  sender: ObjectId; 
  @IsOptional()
  @IsString()
  content?: string;
  @IsOptional()
  @IsString()
  type?: 'text'|'image'|'video' |'poll';
  @IsOptional()
  poll?: {
    question: string;
    options?: { optionText: string; votes?: number }[];
  };
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];
}

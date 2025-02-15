// create-message.dto.ts

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
  groupId: string; // Typically provided as a string, later converted to ObjectId if needed

  @IsNotEmpty()
  @IsString()
  sender: string; // Provided as a string representing the user ID

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];
}

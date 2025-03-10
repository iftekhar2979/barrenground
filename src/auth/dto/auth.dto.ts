// import { IsString } from 'class-validator';
// src/user/dto/create-user.dto.ts
import {
  IsString,
  IsEmail,
  IsBoolean,
  IsOptional,
  IsEnum,
} from 'class-validator';

export class authDto {
  @IsEmail()
  email: string;
  @IsString()
  password: string;
  @IsOptional()
  fcm:string;
}

export class resetPasswordDto {
  @IsString()
  oldPassword: string;
  @IsString()
  newPassword: string;
}
export class forgetPasswordDto{
  @IsString()
  password: string;
  @IsString()
  confirmPassword: string;
}

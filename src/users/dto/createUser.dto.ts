
import {
  IsString,
  IsEmail,
  IsPhoneNumber,
  IsStrongPassword,
  IsOptional,
} from 'class-validator';

export class CreateUserDto {
  @IsString({})
  name: string;
  @IsString()
  password: string;
  @IsEmail()
  email: string;
  @IsOptional()
  @IsString()
  phone: string;
  @IsOptional()
  fcm?: string;

}

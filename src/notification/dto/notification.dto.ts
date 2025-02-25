import { IsString, IsNotEmpty, IsMongoId, IsIn, IsOptional } from 'class-validator';
import { ObjectId } from 'mongoose';

export class CreateNotificationDto {
  @IsMongoId()
  userID: ObjectId;
  @IsMongoId()
  @IsOptional()
  notificationFrom?: ObjectId;
  @IsString()
  @IsNotEmpty()
  message: string;
}

export class CreateDetailedNotificationDto extends CreateNotificationDto {
  // @IsString()
  @IsString()
  @IsNotEmpty()
  key: ObjectId;


  @IsString()
  @IsNotEmpty()
  @IsIn(['group', 'individual']) // Example routing types
  routingType: string;
}
export class CreateDetailedNotificationOnly {
  @IsString()
  notificationID: string;
  @IsMongoId()
  @IsNotEmpty()
  key: ObjectId;

  @IsString()
  @IsNotEmpty()
  @IsIn(['like', 'sms']) // Example routing types
  routingType: string;
}

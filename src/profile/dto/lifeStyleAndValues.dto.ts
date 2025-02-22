// import {
//   IsString,
//   IsNotEmpty,
//   IsArray,
//   IS_ARRAY,
//   IsEnum,
//   IsOptional,
//   IsMongoId,
// } from 'class-validator';
// import { Type } from 'class-transformer';
// import mongoose, { ObjectId, Types } from 'mongoose';
// import { CoreValue, Interest } from '../profile.schema';
// import { CommunicationStyle, DrinkingFrequency, EducationLevel, ExerciseEnum, PetType, RelationshipPreference, SmokingStatus, SocialMediaActivity } from 'src/lifestyle/lifestyle.schema';

// export class LifeStyleDto {

//   @IsNotEmpty()
//   @IsEnum(SmokingStatus, { message: 'Smoking must be Valid !' })
//   smoking: string;

//   @IsNotEmpty()
//   @IsEnum(DrinkingFrequency, { message: 'Drinking Value must be valid!' })
//   drinking: string;

//   @IsNotEmpty()
//   @IsEnum(PetType, { message: 'Pet Value on Life style must be valid!' })
//   pets: string;

//   @IsNotEmpty()
//   @IsEnum(ExerciseEnum, { message: 'Exercise on Life style must be valid!' })
//   execise: string;

//   @IsNotEmpty()
//   @IsEnum(EducationLevel, { message: 'Exercise on Life style must be valid!' })
//   education: string;

//   @IsNotEmpty()
//   @IsEnum(CommunicationStyle, {
//     message: 'Communication style on Life style must be valid!',
//   })
//   communicationStyle: string;

//   @IsNotEmpty()
//   @IsEnum(RelationshipPreference, {
//     message: 'Relationship Preference on life style must be valid!',
//   })
//   relationshipPreference: string;

//   @IsNotEmpty()
//   @IsEnum(SocialMediaActivity, {
//     message: 'Social Media on life style must be valid!',
//   })
//   socialMedia: string;

//   @IsArray()
//   @IsEnum(CoreValue, {
//     each: true,
//     message: 'Each value must be a valid values ',
//   })
//   values: CoreValue[];

//   @IsArray()
//   @IsEnum(Interest, {
//     each: true,
//     message: 'Each value must be a valid interests ',
//   })
//   interest: Interest[];
// }

// export class InterestAndValuesDto {
//   @IsArray()
//   @IsEnum(CoreValue, {
//     each: true,
//     message: 'Each value must be a valid values ',
//   })
//   values?: CoreValue[];

//   @IsArray()
//   @IsEnum(Interest, {
//     each: true,
//     message: 'Each value must be a valid interests ',
//   })
//   interest?: Interest[];
// }

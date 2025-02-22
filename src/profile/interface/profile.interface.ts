// import { CommunicationStyle, DrinkingFrequency, EducationLevel, ExerciseEnum, PetType, RelationshipPreference, SmokingStatus, SocialMediaActivity } from 'src/lifestyle/lifestyle.schema';
// import { interestAndValues } from './../dto/lifeStyleAndValues.dto';
import { Document, Types } from 'mongoose';
import { CoreValue, Interest } from '../profile.schema';

export interface IProfile extends Document {
  // _id?: Types.ObjectId;
  userID: Types.ObjectId; // Reference to the User model
  bio?: string;
  country: string;
  profilePictureUrl?: string;
  languages?: string;
  dOB?: Date;
  education?: string;
  height?: string;
  gender?: string;
  subscribedPlanID?: string;
  lifeStyle?: string[];
  address?: string;
  location?: {
    type: 'Point';
    coordinates: [number, number]; // Coordinates (longitude, latitude)
  };
  age?: number;
  values?: string[];
  interest?: string[];
  galleryID: Types.ObjectId; // Reference to the Gallery model
  isDeleted?: boolean;
  isActive?: boolean;
  isSubscribed?: boolean;
  isBatchAvailable?: boolean;
}
export interface Location{
    type: 'Point';
    coordinates: [number, number]; // Coordinates (longitude, latitude)
 
}
// export interface userLifeStyle {
//   userID?:Types.ObjectId |string
//   smoking: SmokingStatus;
//   drinking: DrinkingFrequency;
//   sleepSchedule?: string;
//   pets: PetType;
//   execise: ExerciseEnum;
//   education: EducationLevel;
//   communicationStyle: CommunicationStyle;
//   relationshipPreference: RelationshipPreference;
//   socialMedia: SocialMediaActivity;
//   values:CoreValue[]
//   interest: Interest[];

// }


export interface InterestAndValuesAttributes {
  values: CoreValue[];
  interest: Interest[];
}

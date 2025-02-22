import { Module } from '@nestjs/common';
import { ProfileService } from './profile.service';
// import { ProfileController } from './profile.controller';
import { Profile, ProfileSchema } from './profile.schema';
import { MongooseModule } from '@nestjs/mongoose';

import { JwtModule } from '@nestjs/jwt';
import { UserService } from 'src/users/users.service';
import { UsersModule } from 'src/users/users.module';

import { User, UserSchema } from 'src/users/users.schema';
import { ProfileController } from './profile.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Profile.name, schema: ProfileSchema },
      { name: User.name, schema: UserSchema },
    ]),
    JwtModule.register({
      secret: 'yourSecretKey', // You should move this to a config file or env variables
      signOptions: { expiresIn: '30d' }, // Token expiration time
    }),
    UsersModule,
  ],
  providers: [ProfileService],
  controllers: [ProfileController],
})
export class ProfileModule {}

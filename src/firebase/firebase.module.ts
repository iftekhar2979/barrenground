import { Module } from '@nestjs/common';
import { FirebaseController } from './firebase.controller';
import { FirebaseService } from './firebase.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Event, EventInformation, EventInfoSchema, EventSchema } from 'src/events/events.schema';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from 'src/users/users.module';
import { User, UserSchema } from 'src/users/users.schema';

@Module({
  controllers: [FirebaseController],
  providers: [FirebaseService],
  exports: [FirebaseService],
})
export class FirebaseModule {}

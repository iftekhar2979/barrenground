import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { MongooseModule } from '@nestjs/mongoose';
import { EventInformation, EventSchema } from 'src/events/events.schema';
import { User, UserSchema } from 'src/users/users.schema';
// import { Event, EventSchema } from '../event/event.schema';
// import { User, UserSchema } from '../user/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Event.name, schema: EventSchema },
      { name: EventInformation.name, schema: EventInformation },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [CronService],
  exports: [CronService],
})
export class CronModule {}

import { Module } from '@nestjs/common';
// import { EventsController } from './events.controller';
// import { EventsService } from './events.service';
import { EventController } from './events.controller';
import { EventService } from './events.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Event, EventInformation, EventInfoSchema, EventSchema } from './events.schema';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from 'src/users/users.module';
@Module({
  imports :[
    MongooseModule.forFeature([
          { name: Event.name, schema: EventSchema },
          {
            name:EventInformation.name, schema:EventInfoSchema
          }
        ]),
        JwtModule.register({
          secret: 'yourSecretKey', // You should move this to a config file or env variables
          signOptions: { expiresIn: '30d' }, // Token expiration time
        }),
        UsersModule,
  ],
  controllers: [EventController],
  providers: [EventService]
})
export class EventsModule {}

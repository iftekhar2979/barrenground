import { Module } from '@nestjs/common';
// import { EventsController } from './events.controller';
// import { EventsService } from './events.service';
import { EventController } from './events.controller';
import { EventService } from './events.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Event, EventInformation, EventInfoSchema, EventSchema } from './events.schema';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from 'src/users/users.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
@Module({
  imports :[
    MongooseModule.forFeature([
          { name: Event.name, schema: EventSchema },
          {
            name:EventInformation.name, schema:EventInfoSchema
          }
        ]),
        JwtModule.registerAsync({
          imports: [ConfigModule],
          useFactory: async (configService: ConfigService) => ({
            secret: configService.get<string>('JWT_SECRET'),
            signOptions: { expiresIn: '30d' },
          }),
          inject: [ConfigService],
        }),
        UsersModule,
  ],
  controllers: [EventController],
  providers: [EventService]
})
export class EventsModule {}

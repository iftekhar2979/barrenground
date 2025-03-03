import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_FILTER, } from '@nestjs/core';
import { ValidationExceptionFilter } from './common/filters/validationError';
import { AuthModule } from './auth/auth.module';
import { EmailserviceModule } from './emailservice/emailservice.module';
import { ProfileModule } from './profile/profile.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { EventsModule } from './events/events.module';
import { ConversationModule } from './conversation/conversation.module';
import { MessageModule } from './message/message.module';
import { GroupParticipantModule } from './group-participant/group-participant.module';
import { SocketModule } from './socket/socket.module';
import { ChatModule } from './chat/chat.module';
import { NotificationModule } from './notification/notification.module';
import { SettingsModule } from './settings/settings.module';
import { SeederService } from './seed/seedService';

@Module({
  imports:  [
    MongooseModule.forRoot('mongodb://localhost:27017/qping-lira'),
    UsersModule,
    AuthModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),  // Serve from the 'public' directory
    }),
    EmailserviceModule,
    ProfileModule,
    EventsModule,
    ConversationModule,
    MessageModule,
    GroupParticipantModule,
    SocketModule,
    ChatModule,
    NotificationModule,
    SettingsModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: ValidationExceptionFilter,
    },
    AppService,
    SeederService,
  ],
})
export class AppModule {}

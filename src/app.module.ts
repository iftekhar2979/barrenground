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
import { ChatController } from './chat/chat.controller';
import { ChatModule } from './chat/chat.module';
import { EventsModule } from './events/events.module';
import { ConversationModule } from './conversation/conversation.module';
import { MessageModule } from './message/message.module';
import { GroupParticipantModule } from './group-participant/group-participant.module';
import { SocketModule } from './socket/socket.module';

@Module({
  imports:  [
    // Connect to MongoDB
    MongooseModule.forRoot('mongodb://localhost:27170/qping-lira'),
    UsersModule,
    AuthModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),  // Serve from the 'public' directory
    }),
    EmailserviceModule,
    ProfileModule,
    ChatModule,
    EventsModule,
    ConversationModule,
    MessageModule,
    GroupParticipantModule,
    SocketModule,
  ],
  controllers: [AppController, ChatController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: ValidationExceptionFilter,
    },
    AppService,
  ],
})
export class AppModule {}

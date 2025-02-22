import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MessageModule } from './../message/message.module';
import { SocketService } from './socket.service';
// import { SocketGateway } from './socket.gateway';
import { Profile } from 'src/profile/profile.schema';
import { ProfileModule } from 'src/profile/profile.module';
// import { NotificationModule } from 'src/notification/notification.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Message, MessageSchema } from 'src/message/message.schema';
// import {
//   Conversation,
//   ConversationSchema,
// } from 'src/conversation/conversation.schema';
// import { ConfigModule, ConfigService } from '@nestjs/config';
import { ConversationModule } from 'src/conversation/conversation.module';
import { Group, GroupSchema } from 'src/conversation/conversation.schema';
import { UsersModule } from 'src/users/users.module';
import { SocketGateway } from './socket.gateway';
import { ChatModule } from 'src/chat/chat.module';
import { GroupParticipantModule } from 'src/group-participant/group-participant.module';
// import { SocketGateway } from './socket.gateway';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: Group.name, schema: GroupSchema },
    ]),
    JwtModule.register({
      secret: 'yourSecretKey', 
      signOptions: { expiresIn: '30d' },
    }),
    UsersModule,
    MessageModule, 
    ConversationModule,
    ChatModule,
   GroupParticipantModule
    // forwardRef(() => ConversationModule), // If needed
  ],
  providers: [SocketGateway, SocketService],
  exports: [SocketService], // Ensure service is exported if used elsewhere
})
export class SocketModule {}

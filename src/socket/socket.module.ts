import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MessageModule } from './../message/message.module';
import { SocketService } from './socket.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Message, MessageSchema, PollVote, PollVoteSchema,  } from 'src/message/message.schema';
import { ConversationModule } from 'src/conversation/conversation.module';
import { Group, GroupSchema } from 'src/conversation/conversation.schema';
import { UsersModule } from 'src/users/users.module';
import { SocketGateway } from './socket.gateway';
import { ChatModule } from 'src/chat/chat.module';
import { GroupParticipantModule } from 'src/group-participant/group-participant.module';
import { NotificationModule } from 'src/notification/notification.module';
import { Conversation, ConversationSchema } from 'src/chat/chat.schema';
import {
  GroupMember,
  GroupMemberSchema,
} from 'src/group-participant/group-participant.schema';
import { MessageService } from './socket.seen.service';
import { MessageSeen, MessageSeenSchema } from 'src/message/schema/seen.schema';
import { Reaction, ReactionSchema } from 'src/message/schema/reaction.schema';
// import { SocketGateway } from './socket.gateway';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: Group.name, schema: GroupSchema },
      { name: Conversation.name, schema: ConversationSchema },
      { name: GroupMember.name, schema: GroupMemberSchema },
      {
        name: PollVote.name,
        schema: PollVoteSchema,
      },
     
      {name:MessageSeen.name,schema:MessageSeenSchema},
      {
        name:Reaction.name,schema:ReactionSchema
      },
    ]),
    JwtModule.register({
      secret: 'yourSecretKey',
      signOptions: { expiresIn: '30d' },
    }),
    UsersModule,
  ],
  providers: [SocketGateway, SocketService,MessageService],
  exports: [SocketService],
})
export class SocketModule {}

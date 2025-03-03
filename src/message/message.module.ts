import { forwardRef, Module } from '@nestjs/common';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';
import { ConversationModule } from 'src/conversation/conversation.module';
// import { Mongoose } from 'mongoose';
import { MongooseModule } from '@nestjs/mongoose';
import { Message, MessageSchema, Reaction, ReactionSchema } from './message.schema';
import { UsersModule } from 'src/users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { SocketModule } from 'src/socket/socket.module';
import { GroupMember, GroupMemberSchema } from 'src/group-participant/group-participant.schema';
import { ChatModule } from 'src/chat/chat.module';
import { Group, GroupSchema } from 'src/conversation/conversation.schema';
import { Conversation, ConversationSchema } from 'src/chat/chat.schema';

@Module({
  imports:[
       JwtModule.register({
          secret: 'yourSecretKey', 
          signOptions: { expiresIn: '30d' }, 
        }),
       UsersModule,
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: Group.name, schema: GroupSchema },
      { name: GroupMember.name, schema: GroupMemberSchema },
      { name: Group.name, schema: GroupSchema },
      { name: Conversation.name, schema: ConversationSchema },
    
    ]),
    ConversationModule,
    SocketModule 
    // forwardRef(() => MessageModule), 
    // forwardRef(() => SocketModule), 
    
  ],
  controllers: [MessageController],
  providers: [MessageService],
  exports:[MessageService]
})
export class MessageModule {}

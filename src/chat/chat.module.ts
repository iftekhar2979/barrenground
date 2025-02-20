import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
// import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { Conversation, ConversationSchema } from './chat.schema';
import { Message, MessageSchema } from 'src/message/message.schema';
import { MessageModule } from 'src/message/message.module';
import { UsersModule } from 'src/users/users.module';
import { ChatController } from './chat.controller';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports:[
    JwtModule.register({
      secret: 'yourSecretKey', // You should move this to a config file or env variables
      signOptions: { expiresIn: '30d' }, // Token expiration time
    }),
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      {
              name: Message.name,
              schema: MessageSchema,
            },
    ]),
    UsersModule,
    MessageModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}

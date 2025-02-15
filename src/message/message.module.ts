import { Module } from '@nestjs/common';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';
import { ConversationModule } from 'src/conversation/conversation.module';
import { Mongoose } from 'mongoose';
import { MongooseModule } from '@nestjs/mongoose';
import { Message, MessageSchema } from './message.schema';
import { UsersModule } from 'src/users/users.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports:[
       JwtModule.register({
          secret: 'yourSecretKey', // You should move this to a config file or env variables
          signOptions: { expiresIn: '30d' }, // Token expiration time
        }),
        UsersModule,
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
    ]),
    ConversationModule
  ],
  controllers: [MessageController],
  providers: [MessageService],
})
export class MessageModule {}

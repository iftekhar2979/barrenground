import { forwardRef, Module } from '@nestjs/common';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';
import { ConversationModule } from 'src/conversation/conversation.module';
// import { Mongoose } from 'mongoose';
import { MongooseModule } from '@nestjs/mongoose';
import { Message, MessageSchema } from './message.schema';
import { UsersModule } from 'src/users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { SocketModule } from 'src/socket/socket.module';

@Module({
  imports:[
       JwtModule.register({
          secret: 'yourSecretKey', 
          signOptions: { expiresIn: '30d' }, 
        }),
       UsersModule,
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
    ]),
    ConversationModule,
    // forwardRef(() => SocketModule), 
  ],
  controllers: [MessageController],
  providers: [MessageService],
  exports:[MessageService]
})
export class MessageModule {}

import { Module } from '@nestjs/common';
import { ConversationController } from './conversation.controller';
import { ConversationService } from './conversation.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Group, GroupSchema } from './conversation.schema';
import {
  GroupMember,
  GroupMemberSchema,
} from 'src/group-participant/group-participant.schema';
// import { UploadService } from 'src/common/multer/upload.service';
// import { CustomFileInterceptor } from 'src/common/interceptors/custom-file-uploader.interceptors';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from 'src/users/users.module';
import { GroupParticipantModule } from 'src/group-participant/group-participant.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Group.name, schema: GroupSchema },
      { name: GroupMember.name, schema: GroupMemberSchema },
    ]),
    JwtModule.register({
      secret: 'yourSecretKey', // You should move this to a config file or env variables
      signOptions: { expiresIn: '30d' }, // Token expiration time
    }),
    UsersModule,
    GroupParticipantModule,
    // UploadService
  ],
  controllers: [ConversationController],
  providers: [ConversationService],
  exports: [ConversationService],
})
export class ConversationModule {}

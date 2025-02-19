import { Module } from '@nestjs/common';
import { GroupParticipantController } from './group-participant.controller';
import { GroupService } from './group-participant.service';
import { MongooseModule } from '@nestjs/mongoose';
import { GroupMember, GroupMemberSchema } from './group-participant.schema';

@Module({
  imports:[
      MongooseModule.forFeature([
          // { name: Group.name, schema: GroupSchema },
          { name: GroupMember.name, schema: GroupMemberSchema },
        ]),
        
  ],
  controllers: [GroupParticipantController],
  providers: [GroupService],
 exports: [GroupService],
})
export class GroupParticipantModule {}

import { Module } from '@nestjs/common';
import { GroupParticipantController } from './group-participant.controller';
import { GroupParticipantService } from './group-participant.service';

@Module({
  controllers: [GroupParticipantController],
  providers: [GroupParticipantService]
})
export class GroupParticipantModule {}

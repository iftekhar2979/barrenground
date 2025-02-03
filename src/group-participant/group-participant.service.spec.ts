import { Test, TestingModule } from '@nestjs/testing';
import { GroupParticipantService } from './group-participant.service';

describe('GroupParticipantService', () => {
  let service: GroupParticipantService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GroupParticipantService],
    }).compile();

    service = module.get<GroupParticipantService>(GroupParticipantService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { GroupParticipantController } from './group-participant.controller';

describe('GroupParticipantController', () => {
  let controller: GroupParticipantController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GroupParticipantController],
    }).compile();

    controller = module.get<GroupParticipantController>(GroupParticipantController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

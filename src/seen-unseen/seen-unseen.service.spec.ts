import { Test, TestingModule } from '@nestjs/testing';
import { SeenUnseenService } from './seen-unseen.service';

describe('SeenUnseenService', () => {
  let service: SeenUnseenService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SeenUnseenService],
    }).compile();

    service = module.get<SeenUnseenService>(SeenUnseenService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

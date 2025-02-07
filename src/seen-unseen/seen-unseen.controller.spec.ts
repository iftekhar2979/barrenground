import { Test, TestingModule } from '@nestjs/testing';
import { SeenUnseenController } from './seen-unseen.controller';

describe('SeenUnseenController', () => {
  let controller: SeenUnseenController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SeenUnseenController],
    }).compile();

    controller = module.get<SeenUnseenController>(SeenUnseenController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

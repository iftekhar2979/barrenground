import { Module } from '@nestjs/common';
import { SeenUnseenController } from './seen-unseen.controller';
import { SeenUnseenService } from './seen-unseen.service';

@Module({
  controllers: [SeenUnseenController],
  providers: [SeenUnseenService]
})
export class SeenUnseenModule {}

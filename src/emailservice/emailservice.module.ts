import { Module } from '@nestjs/common';
import { EmailService } from './emailservice.service';
import { ConfigModule } from '@nestjs/config';
// import { EmailserviceService } from './emailservice.service';

@Module({
  imports:[
    ConfigModule
  ],
  providers: [EmailService],
  exports:[EmailService]
})
export class EmailserviceModule {}

import { Controller, Post, Body } from '@nestjs/common';
import { FirebaseService } from './firebase.service';

@Controller('firebase')
export class FirebaseController {
  constructor(private readonly firebaseService: FirebaseService) {}

  @Post('send')
  async sendNotification(@Body() body: { token: string; title: string; body: string; data?: any }) {
    return this.firebaseService.sendPushNotification(body.token, body.title, body.body);
  }
}
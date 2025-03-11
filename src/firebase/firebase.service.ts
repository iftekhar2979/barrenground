import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from 'src/users/users.schema';
import { Event } from 'src/events/events.schema';

@Injectable()
export class FirebaseService {
  private messaging: admin.messaging.Messaging;
  constructor(

  ) {
const firebase= require('./firebase.config.json')

    if (!admin.apps.length) {
      console.log('Initializing Firebase Admin SDK...');
      admin.initializeApp({
        credential: admin.credential.cert(firebase as admin.ServiceAccount),
      });
    } else {
      console.log('Firebase Admin SDK already initialized.');
    }
    this.messaging = admin.messaging();
  }

  // Send notification to a specific device by FCM token
  async sendPushNotification(token: string, title: string, body: string) {
    const message = {
      notification: {
        title: title,
        body: body,
      },
      token: token,
    };

    try {
        console.log('Messaging Initialized:', admin.messaging());
      const response = await admin.messaging().send(message);
      console.log('Sending Message:', JSON.stringify(message, null, 2));
      console.log('response', response);
      return response;
    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error('Failed to send notification');
    }
  }

  async sendPushNotificationToMultiple(
    tokens: string[],
    title: string,
    body: string,
  ) {
    const message = {
      notification: {
        title: title,
        body: body,
      },
      tokens: tokens,
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      console.log('Successfully sent message:', response);
      return response;
    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error('Failed to send notification');
    }
  }
}

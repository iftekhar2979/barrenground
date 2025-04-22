import { Injectable, Logger } from '@nestjs/common';
import * as cron from 'node-cron';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as admin from 'firebase-admin';
import { Event } from 'src/events/events.schema';
import { User } from 'src/users/users.schema';
import { userInfo } from 'os';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    @InjectModel(Event.name) private readonly eventModel: Model<Event>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {
    this.scheduleEventNotifications();
  }

  scheduleEventNotifications() {
    console.log('Cron Job Scheduled');
    cron.schedule('0 0 * * *', async () => {
      // Runs every hour
      this.logger.log(
        '🔍 Checking for events happening in the next 24 hours...',
      );

      const now = new Date();
      const next24Hours = new Date();
      next24Hours.setHours(now.getHours() + 24);

      // Find events happening in the next 24 hours
      const upcomingEvents = await this.eventModel.aggregate([
        {
          $match: { eventDate: { $gte: now, $lt: next24Hours } },
        },
        {
            $lookup: {
              from: 'eventinformations',
              localField: '_id',
              foreignField: 'eventId',
              as: 'eventInfo',
            },
          },
          {
            $lookup: {
              from: 'members',
              localField: 'eventInfo._id',
              foreignField: 'eventInformationId',
              as: 'eventMembers',
            },
          },
      ]);
      if (upcomingEvents.length === 0) {
        this.logger.log('✅ No upcoming events in the next 24 hours.');
        return;
      }

      for (const event of upcomingEvents) {
        let users = event.eventInfo.map((item) => item.userID);
        const infos= await this.userModel.find({_id:{$in:users}},{fcm:1,_id:0})
        if (infos.length===0) {
          this.logger.warn(`⚠️ No valid FCM token for user ${event.userID}`);
          continue;
        }

        await this.sendPushNotificationToMultiple(
            infos.map(item=>item.fcm),
            event.eventName,
            event.eventDate,
            event.eventTime
        )
    
      }
    });
  }
  async sendPushNotification(
    token: string,
    eventName: string,
    eventDate: Date,
    eventTime: string,
  ) {
    const message = {
      notification: {
        title: `Reminder: Upcoming Event`,
        body: `Your event "${eventName}" is happening in 24 hours on ${eventDate.toDateString()} at ${eventTime} .`,
      },
      token: token,
    };

    try {
      const response = await admin.messaging().send(message);
      this.logger.log(`✅ Notification sent successfully: ${response}`);
    } catch (error) {
      this.logger.error(`❌ Error sending notification: ${error.message}`);
    }
  }
  async sendPushNotificationToMultiple(
    token: string[],
    eventName: string,
    eventDate: Date,
    eventTime: string,
  ) {
    const message = {
      notification: {
        title: `Reminder: Upcoming Event`,
        body: `Your event "${eventName}" is happening in 24 hours on ${eventDate.toDateString()} at ${eventTime} .`,
      },
      tokens: token,
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      this.logger.log(`✅ Notification sent successfully: ${response}`);
    } catch (error) {
      this.logger.error(`❌ Error sending notification: ${error.message}`);
    }
  }
}

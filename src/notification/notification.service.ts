import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, ObjectId } from 'mongoose';
import { ObjectId as mongoID } from 'mongodb';
import { DetailedNotification, Notification } from './notification.schema';
import {
  CreateDetailedNotificationDto,
  CreateDetailedNotificationOnly,
} from './dto/notification.dto';
import { pagination } from 'src/common/pagination/pagination';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<Notification>,
    @InjectModel(DetailedNotification.name)
    private notificationDetailModel: Model<DetailedNotification>,
  ) {}

  /**
   * Create a notification and store it in the database.
   * @param createNotificationDto - DTO containing the notification details.
   */
  async createNotification(
    createNotificationDto: CreateDetailedNotificationDto,
    // createDetailedNotificationDto: CreateDetailedNotificationOnly,
  ): Promise<void> {
    try {
      // this.socketService.getSocketByUserId(createNotificationDto.userID.toString()).emit("notifications",createNotificationDto)
      // let receiverExist=
      const newNotification = new this.notificationModel(createNotificationDto);
      await newNotification.save();
      let detailNotification: CreateDetailedNotificationOnly = {
        notificationID: newNotification._id.toString(),
        key: createNotificationDto.key,
        routingType: createNotificationDto.routingType,
      };
      await this.createDetailedNotification(detailNotification);
    } catch (error) {
      console.log(error);
      // this.socketService.getSocketByUserId(createNotificationDto.userID.toString()).emit("notifications",createNotificationDto)
      throw new Error(error.message);
    }
  }

  async createDetailedNotification(
    createDetailedNotificationDto: CreateDetailedNotificationOnly,
  ): Promise<void> {
    try {
      const { notificationID, key, routingType } =
        createDetailedNotificationDto;
      const notification =
        await this.notificationModel.findById(notificationID);
      if (!notification) {
        throw new Error(
          `Notification with ID ${notificationID} does not exist.`,
        );
      }

      const notificationDetail = new this.notificationDetailModel({
        notificationID,
        key,
        routingType,
      });
      await notificationDetail.save();
    } catch (error) {
      throw new Error(error.message);
      // console.log(`Details added to notification ${notificationID}:`, notificationDetail);
    }
  }

  async getNotification(notificationID: string): Promise<any> {
    try {
      const notification =
        await this.notificationModel.findById(notificationID);
      if (!notification) {
        throw new Error(
          `Notification with ID ${notificationID} does not exist.`,
        );
      }
      const details = await this.notificationDetailModel.find({
        notificationID,
      });
      return {
        ...notification.toObject(),
        details,
      };
    } catch (error) {
      console.log(error);
    }
  }

  async getAllNotifications(
    userID: string,
    page: number,
    limit: number,
  ): Promise<any> {
    try {
      const skip = (page - 1) * limit;
      console.log(userID);
      const notifications = await this.notificationModel.aggregate([
        {
          $match: { userID: new mongoose.Types.ObjectId(userID) }, // Match the userID
        },
        {
          $lookup: {
            from: 'users', // The collection to join (must match MongoDB collection name)
            localField: 'notificationFrom',
            foreignField: '_id',
            as: 'notificationFrom',
          },
        },
        {
          $unwind: {
            path: '$notificationFrom',
            preserveNullAndEmptyArrays: true, // If `notificationFrom` can be null, keep it
          },
        },
        {
          $project: {
            message: 1,
            createdAt: 1,
            'notificationFrom._id': 1,
            'notificationFrom.name': 1,
            'notificationFrom.email': 1,
            'notificationFrom.profilePicture': 1,
          },
        },
        {
          $sort: { createdAt: -1 },
        },
        {
          $skip: skip,
        },
        {
          $limit: limit,
        },
      ]);

      const total = await this.notificationModel.countDocuments({ userID });

      return {
        message: 'Found Notifications',
        data: notifications,
        pagination: pagination(limit, page, total),
      };
    } catch (error) {
      console.log(error);
      throw new Error(error.message);
    }
  }

  async batchUpdateNotificationsBulk(
    userIds: ObjectId[], // Array of userIds
    updateDto: {
      message: string;
      routingType: 'group' | 'individual';
      key: ObjectId;
    },
  ): Promise<any> {
    try { 
      const bulkOps = userIds.map((userId) => ({
        updateMany: {
          filter: { userID: userId }, 
          update: { $set: updateDto }, 
        },
      }));
      const result = await this.notificationModel.bulkWrite(bulkOps);
      return result;
    } catch (error) {
      console.error(
        'Error while performing batch update with bulk operations:',
        error,
      );
      throw new Error('Batch update failed');
    }
  }
}

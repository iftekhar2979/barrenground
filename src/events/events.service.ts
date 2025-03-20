import { limits } from 'argon2';
import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Event, EventInformation } from './events.schema';
import { pagination } from 'src/common/pagination/pagination';

@Injectable()
export class EventService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<Event>,
    @InjectModel(EventInformation.name)
    private eventInformation: Model<EventInformation>,
  ) {}

  async createEvent(userId, eventData: Partial<Event>) {
    const event = new this.eventModel({ userID: userId, ...eventData });
    return await event.save();
  }
  async updateEvent(eventId: string, eventData: Partial<Event>) {
    const event = await this.eventModel.findById(eventId);
    if (!event) {
      throw new HttpException('No Event Found With this Name', 404);
    }
    let updated = await this.eventModel.findByIdAndUpdate(eventId, {
      ...eventData,
    });

    return {
      message: 'Event Updated Successfully',
      data: updated,
    };
  }

  async findAllEvents({
    userId,
    name = '',
    status = 'accepted',
    page = 1,
    limit = 10,
  }: {
    userId: string;
    name: string;
    status: 'accepted' | 'pending' | 'all';
    page?: number;
    limit: number;
  }) {
    let query = {
      eventName: { $regex: name, $options: 'i' },
      isAcceptedByAdmin: status === 'accepted' ? true : false,
    };
    if (status === 'all') {
      delete query.isAcceptedByAdmin;
    }
    const events = await this.eventModel.aggregate([
      {
        $match: query,
      },
      {
        $lookup: {
          from: 'eventinformations',
          localField: '_id',
          foreignField: 'eventId',
          as: 'involvedUsers',
        },
      },
      {
        $match: {
          'involvedUsers.userID': {
            $not: {
              $eq: new mongoose.Types.ObjectId(userId),
            },
          },
        },
      },
      {
        $addFields: {
          isMyEvent: { $eq: ['$userID', new mongoose.Types.ObjectId(userId)] },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $skip: (page - 1) * limit,
      },
      {
        $limit: limit,
      },
      {
        $project: {
          involvedUsers: 0,
        },
      },
    ]);
    const totalEvent = await this.eventModel.countDocuments({
      eventName: { $regex: name, $options: 'i' },
    });
    return {
      message: 'Event Retrived Successfully',
      data: events,
      pagination: pagination(limit, page, totalEvent),
    };
  }
  async findAllEventsByUserId(
    id,
    { page = 1, limit = 10 }: { page: number; limit: number },
  ) {
    const [counts, events] = await Promise.all([
      this.eventModel.countDocuments({ userID: id }),
      this.eventModel
        .aggregate([
          {
            $match: { userID: new mongoose.Types.ObjectId(id) },
          },
          {
            $lookup: {
              from: 'eventinformations',
              localField: '_id',
              foreignField: 'eventId',
              as: 'involvedUsers',
              pipeline: [
                {
                  $lookup: {
                    from: 'users',
                    localField: 'userID',
                    foreignField: '_id',
                    as: 'user',
                    pipeline: [
                      {
                        $project: {
                          name: 1,
                          email: 1,
                          _id: 1,
                          profilePicture: 1,
                        },
                      },
                    ],
                  },
                },
                {
                  $unwind: {
                    path: '$user',
                    preserveNullAndEmptyArrays: true, // Keep event info even if there’s no user
                  },
                },
                {
                  $project: {
                    _id: 1,
                    name: '$user.name',
                    email: '$user.email',
                    profilePicture: '$user.profilePicture',
                    userId: '$user._id',
                  },
                },
              ],
            },
          },
          {
            $sort: { createdAt: -1 },
          },
          {
            $limit: limit,
          },
          {
            $skip: (page - 1) * limit,
          },
        ])
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit)
        .exec(),
    ]);

    return {
      message: 'Event Retrived Successfully',
      data: events,
      pagination: pagination(limit, page, counts),
    };
  }
  async findEventById(eventId: string) {
    return this.eventModel.findById(eventId).exec();
  }
  async delete(eventId: string) {
    console.log(eventId);
    await this.eventModel.deleteOne({
      _id: new mongoose.Types.ObjectId(eventId),
    });
    return {
      message: 'Event Deleted Successfully',
      data: {},
    };
  }
  async getSingleEvent({
    eventId,
    page = 1,
    limit = 10,
  }: {
    eventId: string;
    page: number;
    limit: number;
  }) {
    let pipeline: any = [
      {
        $match: {
          eventId: new mongoose.Types.ObjectId(eventId),
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userID',
          foreignField: '_id',
          as: 'user',
          pipeline: [
            {
              $project: {
                name: 1,
                email: 1,
                _id: 1,
                profilePicture: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true, // Keep event info even if there’s no user
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $skip: (page - 1) * limit,
      },
      {
        $limit: limit,
      },
      {
        $project: {
          _id: 1,
          name: '$user.name',
          email: '$user.email',
          profilePicture: '$user.profilePicture',
          userId: '$user._id',
        },
      },
    ];

    const [eventInfo, count] = await Promise.all([
      this.eventInformation.aggregate(pipeline),
      this.eventInformation.countDocuments({
        eventId: new mongoose.Types.ObjectId(eventId),
      }),
    ]);
    // console.log(count)
    if (!count) {
      throw new HttpException('No users are interested', 404);
    }
    return {
      message: 'Interested user retrived',
      data: eventInfo,
      pagination: pagination(limit, page, count),
    };
  }
  async getMyInterestedEvents({
    userId,
    page = 1,
    limit = 10,
  }: {
    userId: string;
    page: number;
    limit: number;
  }) {
    let pipeline: any = [
      {
        $match: {
          userID: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $lookup: {
          from: 'events',
          localField: 'eventId',
          foreignField: '_id',
          as: 'event',
        },
      },
      {
        $unwind: {
          path: '$event',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $skip: (page - 1) * limit,
      },
      {
        $limit: limit,
      },
      {
        $project: {
          eventId:1,
          eventName: '$event.eventName',
          eventDate: '$event.eventDate',
          eventTime: '$event.eventTime',
          eventLocation: '$event.eventLocation',
          eventDescription: '$event.eventDescription',
          joined: '$event.joined',
          createdAt: '$event.createdAt',
          updatedAt: '$event.updatedAt',
        },
      },
    ];
    const [eventInfo, count] = await Promise.all([
      this.eventInformation.aggregate(pipeline),
      this.eventInformation.countDocuments({
        userID: new mongoose.Types.ObjectId(userId),
      }),
    ]);
    if (!count) {
      throw new HttpException('No event found', 404);
    }
    return {
      message: 'Event retrived successfully',
      data: eventInfo,
      pagination: pagination(limit, page, count),
    };
  }
  async joinEvent(eventId: string, userId: string) {
    // Fetch event and check if the user has already joined
    let [event, eventInfo] = await Promise.all([
      this.eventModel.findById(eventId) as unknown as Event,
      this.eventInformation.findOne({
        eventId: new mongoose.Types.ObjectId(eventId),
        userID: new mongoose.Types.ObjectId(userId),
      }),
    ]);
    if (eventInfo) {
      throw new BadRequestException('You are already joined to this event');
    }
    if (!event) {
      throw new BadRequestException('No event found with this ID');
    }
    event.joined = event.joined + 1;

    const eventInformation = new this.eventInformation({
      eventId: new mongoose.Types.ObjectId(eventId),
      userID: new mongoose.Types.ObjectId(userId),
    });
    try {
      await eventInformation.validate(); // Check for validation errors
    } catch (error) {
      console.error('Validation failed for eventInformation:', error);
      throw new BadRequestException('Event information is not valid');
    }

    console.log('Event information:', eventInformation);

    // Save both the event and eventInformation
    await Promise.all([eventInformation.save(), event.save()]);

    return {
      message: 'Joined the event successfully',
      data: eventInformation, // Return event information if needed
    };
  }
}

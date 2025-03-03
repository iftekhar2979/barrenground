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
    page = 1,
    limit = 10,
  }: {
    userId: string;
    page?: number;
    limit: number;
  }) {
    const events = await this.eventModel.aggregate([
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
   
    ]);
    const totalEvent = await this.eventModel.countDocuments();
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
        .find({ userID: id })
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

    console.log(eventInformation);
    // Validate the eventInformation document before saving
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

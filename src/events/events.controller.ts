import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
  Request,
  Patch,
  Query,
  Delete,
  BadRequestException,
} from '@nestjs/common';
import { EventService } from './events.service';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guard/role-gurad';
import { Roles } from 'src/common/custom-decorator/role.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from 'src/common/multer/multer.config';
import {
  PaginationDto,
  PaginationOptions,
  SearchByNameWithPagination,
} from 'src/common/dto/pagination.dto';

@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  async createEvent(@Request() req, @Body() eventData) {
    const id = req.user.id;
    if(eventData.eventName.length<3 || eventData.eventName.length>50){
      throw new BadRequestException("Event name should between 3 to 50 characters long")
    }
    if(eventData.eventDescription.length<3 || eventData.eventDescription.length>200){
      throw new BadRequestException("Event Description should between 3 to 200 characters long")
    }
    if(eventData.location.length<3 || eventData.location.length>200){
      throw new BadRequestException("Event Location should between 3 to 200 characters long")
    }
    return this.eventService.createEvent(id, eventData);
  }
  @Post(':eventId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  async JoinToEvent(@Request() req, @Param('eventId') eventId) {
    const id = req.user.id;
    return this.eventService.joinEvent(eventId, id);
  }
  @Get('details/:eventId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  async getSingleEvent(
    @Request() req,
    @Param('eventId') eventId,
    @Query() pagination: PaginationOptions,
  ) {
    return this.eventService.getSingleEvent({
      eventId,
      page: parseFloat(pagination.page),
      limit: parseFloat(pagination.limit),
    });
  }
  @Get('interest')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  async getInterested(
    @Request() req,
    @Query() pagination: PaginationOptions,
  ) {
    return this.eventService.getMyInterestedEvents({
      userId: req.user.id,
      page: parseFloat(pagination.page),
      limit: parseFloat(pagination.limit),
    });
  }
  @Patch(':eventId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user','admin')
  async updateEvent(
    @Request() req,
    @Param('eventId') eventId: string,
    @Body() eventData,
  ) {
   if(req.user.role!=="admin"){
     if(eventData.isAcceptedByAdmin){
       throw new BadRequestException("You don't have the required role!")
     }
   }
    return this.eventService.updateEvent(eventId, eventData);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user','admin')
  async getAllEvents(@Request() req, @Query() pagination: SearchByNameWithPagination) {
    return this.eventService.findAllEvents({
      userId: req.user.id,
      status: pagination.status as 'accepted' | 'pending' | 'all',
      name:pagination.term,
      page: parseFloat(pagination.page),
      limit: parseFloat(pagination.limit),
    });
  }

  @Get('/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  async getAllMyEvents(@Request() req, @Query() pagination: PaginationOptions) {
    return this.eventService.findAllEventsByUserId(req.user.id, {
      page: parseFloat(pagination.page),
      limit: parseFloat(pagination.limit),
    });
  }

  @Delete(':eventId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user','admin')
  async deleteEvent(@Param('eventId') eventId: string) {
    if (!eventId) {
      throw new BadRequestException('Please Give the Event');
    }
    return this.eventService.delete(eventId);
  }


}

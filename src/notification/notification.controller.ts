import {
    Controller,
    Get,
    Param,
    Query,
    Request,
    UseGuards,
  } from '@nestjs/common';
  import { NotificationService } from './notification.service';
  import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
  import { RolesGuard } from 'src/auth/guard/role-gurad';
  import { Roles } from 'src/common/custom-decorator/role.decorator';
  import { PaginationOptions } from 'src/common/dto/pagination.dto';
  
  @Controller('notifications')
  export class NotificationController {
    constructor(private readonly notificationService: NotificationService) {}
    @Get("")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('user')
    async getAllMessage(
      @Request() req,
      @Query() paginationOptions: PaginationOptions,
    ) {
      const user = req.user;
      return await this.notificationService.getAllNotifications(
        user.id,
        Number(paginationOptions.page),
        Number(paginationOptions.limit),
      );
    }
    @Get(":id")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('user')
    async getSingleNotification(
      @Request() req,
      @Param("id") notificationId:string 
    ) {
      return await this.notificationService.getNotification(notificationId);
    }
  }
  
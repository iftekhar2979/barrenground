import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { UsersModule } from 'src/users/users.module';
import {
  DetailedNotification,
  DetailedNotificationSchema,
  Notification,
  NotificationSchema,
} from './notification.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { SocketModule } from 'src/socket/socket.module';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Notification.name,
        schema: NotificationSchema,
      },
      {
        name: DetailedNotification.name,
        schema: DetailedNotificationSchema,
      },
    ]),
     JwtModule.registerAsync({
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          secret: configService.get<string>('JWT_SECRET'),
          signOptions: { expiresIn: '30d' },
        }),
        inject: [ConfigService],
      }),
    UsersModule,
    // SocketModule
  ],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}

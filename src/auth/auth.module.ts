import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from 'src/users/users.module';
import { User, UserSchema } from 'src/users/users.schema';
import { MongooseModule } from '@nestjs/mongoose';
// import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UserService } from 'src/users/users.service';
import { Otp, OtpSchema } from './otp.schema';
// import { EmailService } from 'src/common/mailer/sendMail';
import { EmailserviceModule } from 'src/emailservice/emailservice.module';
import { Reflector } from '@nestjs/core';
import { Profile, ProfileSchema } from 'src/profile/profile.schema';
import { ConfigModule, ConfigService } from '@nestjs/config';


@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    MongooseModule.forFeature([{ name: Otp.name, schema: OtpSchema }]),
    MongooseModule.forFeature([{ name: Profile.name, schema: ProfileSchema }]),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '30d' },
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    EmailserviceModule,
    Reflector,  // Register Reflector for metadata reflection
  ],
  providers: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}

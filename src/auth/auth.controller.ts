import { error } from 'console';
import { UserService } from 'src/users/users.service';
import {
  Body,
  Controller,
  Post,
  ExceptionFilter,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { authDto, forgetPasswordDto, resetPasswordDto } from './dto/auth.dto';
import { CreateUserDto } from 'src/users/dto/createUser.dto';
import { JwtAuthGuard } from './guard/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post('register')
  async create(@Body() createUserDto: CreateUserDto) {
    return this.authService.create(createUserDto);
  }
  @Post('login')
  async login(@Body() authDto: authDto) {
    return this.authService.find(authDto);
  }
  @Post('otp/verify')
  @UseGuards(JwtAuthGuard)
  VerifyOtp(@Request() req, @Body() body: { code: string }) {
    const user = req.user; // Access user data from JWT
    const code = body.code;
    return this.authService.verifyOtp(user, code);
  }
  @Post('otp/resend')
  @UseGuards(JwtAuthGuard)
  resendOtp(@Request() req) {
    const user = req.user; // Access user data from JWT
    return this.authService.resendOtp(user);
  }
  @Post('otp/send-for-forgot-password')
  resendOtpForForget(@Request() req, @Body('email') email: string) {
    return this.authService.resendOtpForForget(email);
  }
  @Post('password/reset')
  @UseGuards(JwtAuthGuard)
  resetPassword(@Request() req, @Body() resetPasswordDto: resetPasswordDto) {
    const user = req.user; // Access user data from JWT
    return this.authService.resetPassword(user, resetPasswordDto);
  }
  @Post('password/forgot')
  @UseGuards(JwtAuthGuard)
  forgetPassword(@Request() req, @Body() forgetPasswordDto:forgetPasswordDto) {
    const user = req.user; 
    return this.authService.forgetPassword(user, forgetPasswordDto);
  }
}

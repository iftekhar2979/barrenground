import { UserService } from 'src/users/users.service';
// import { IProfile } from './../profile/interface/profile.interface';
import { resetPasswordDto, forgetPasswordDto } from './dto/auth.dto';
// import { EmailService } from './../common/mailer/sendMail';
import { JwtService } from '@nestjs/jwt';
import { authDto } from './dto/auth.dto';
import {
  BadGatewayException,
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import {
  comparePassword,
  comparePasswordWithArgon,
  hashPassword,
} from 'src/common/bycrypt/bycrypt';
import { User } from 'src/users/users.schema';
import { profile, error } from 'console';
import { IUser } from 'src/users/users.interface';
import { CreateUserDto } from 'src/users/dto/createUser.dto';
import { generateOtp } from 'src/common/utils/generateOtp';
import { Otp } from './otp.schema';
import { EmailService } from 'src/emailservice/emailservice.service';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { otp } from './interface/otp.inteface';
import { Profile } from 'src/profile/profile.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Otp.name) private otpModel: Model<Otp>,
    @InjectModel(User.name) private userModel: Model<User>, // Injecting the User model
    // @InjectModel(Profile.name) private profileModel: Model<IProfile>,
    private jwtService: JwtService, // Injecting the JwtService for token generation
    private emailService: EmailService,
  ) {}
  async checkUserExistWiththeName(createUserDto: CreateUserDto): Promise<User> {
    return await this.userModel.findOne({ name: createUserDto.name });
  }
  async checkUserExistWiththeEmail(
    createUserDto: CreateUserDto,
  ): Promise<User> {
    return await this.userModel.findOne({ email: createUserDto.email });
  }
  async checkUserExistWithPhone(createUserDto: CreateUserDto): Promise<User> {
    return await this.userModel.findOne({ phone: createUserDto.phone });
  }
  
  async create(createUserDto: CreateUserDto): Promise<any> {
    const existingUser = await this.userModel.findOne({
      $or: [
        { name: createUserDto.name },
        { email: createUserDto.email },
        { phone: createUserDto.phone },
      ],
    });
   
    if (existingUser) {
      if (existingUser.name === createUserDto.name) {
        console.log('User with this name already exists!=======');
        
        throw new BadRequestException('User with this name already exists!');
      }
      if (existingUser.email === createUserDto.email) {
        throw new BadRequestException('User with this Email already exists!');
      }
      if (existingUser.phone === createUserDto.phone) {
        throw new BadRequestException(
          'User with this Phone Number already exists!',
        );
      }
    }
    // Create the user
    const newUser = new this.userModel({ ...createUserDto });
    let otp = generateOtp();
    const currentDate = new Date();
    currentDate.setMinutes(currentDate.getMinutes() + 3); // OTP expiration time (3 minutes from now)

    // Create OTP document
    const saveOtp = new this.otpModel({
      oneTimePassword: otp,
      userID: newUser._id,
      expiredAt: currentDate,
    });
    // Send OTP email
    this.emailService
      .sendOtpEmail(newUser.email, otp, newUser.name)
      .then(() => {
        console.log(`OTP email sent to ${newUser.email} OTP ${otp}`);
      })
      .catch((error) => {
        console.error('Error sending OTP email:', error);
      });
    console.timeEnd('Email Service');
    // Prepare JWT payload
    const payload = {
      email: newUser.email,
      id: newUser._id,
      role: newUser.role,
      name: newUser.name,
      profilePicture:newUser.profilePicture
    };
    // Sign the JWT token
    const token = this.jwtService.sign(payload);
    console.time('Save User');
    let savedUser = await newUser.save();
    console.timeEnd('Save User');
    savedUser.password = undefined;
    savedUser.isEmailVerified = undefined;
    savedUser.isDeleted = undefined;
    console.time('Save OTP');
    await saveOtp.save();
    return {
      message:
        'Please Check Your Email and Verify you email to get full access',
      data: savedUser,
      token,
    };
  }
  async checkOtpExist(userId: string) {
    return await this.otpModel.findOne({ userID: userId });
  }
  async generateOtpModel(userId: string) {
    let otp = generateOtp();
    const currentDate = new Date();
    currentDate.setMinutes(currentDate.getMinutes() + 3); // OTP expiration time (3 minutes from now)
    return new this.otpModel({
      oneTimePassword: otp,
      userID: userId,
      expiredAt: currentDate,
    });
  }

  async find(authDto) {
    console.log(authDto);
    
    let user = await this.userModel.findOne({ email: authDto.email });
    if (!user) {
      throw new BadRequestException('User not Found!');
    }
    let isMatch = await comparePasswordWithArgon(
      authDto.password,
      user.password,
    );
    if (!isMatch) {
      throw new BadRequestException('Invalid Credential!');
    }
    user.password = undefined;
    if (!user.isEmailVerified) {
      let checkOtpExist = await this.checkOtpExist(user._id.toString());
      if (checkOtpExist) {
        const payload = {
          id: user._id,
          tokenFor: 'email-verification',
        };
        const token = this.jwtService.sign(payload);
        throw new UnauthorizedException({
          message:
            'Please Check Your Email and Verify Your Email First to access Profile',
          error: 'Unauthorized',
          details:
            'If you did not receive a verification email, please check your spam folder or request a new verification Code.',
          token: token,
        });
      }
      let generateOtpModel = await this.generateOtpModel(user._id.toString());
      await this.emailService.sendOtpEmail(
        user.email,
        generateOtpModel.oneTimePassword,
        user.name,
      );
      generateOtpModel.save();

      const payload = {
        id: user._id,
        tokenFor: 'email-verification',
      };
      const token = this.jwtService.sign(payload);
      throw new UnauthorizedException({
        message:
          'You are Not Verified User . Please Verify Your email first to access Profile',
        error: 'Unauthorized',
        details:
          'If you did not receive a verification email, please check your spam folder or request a new verification Code.',
        token: token,
      });
    }
    console.log(user)
    const payload = {
      email: user.email,
      id: user._id,
      role: user.role,
      name: user.name,
      tokenFor: 'auth',
      profilePicture:user.profilePicture
    };
    console.log(payload)
    const token = this.jwtService.sign(payload);
    return { message: 'Logged In Successfully', data: user, token };
  }
  async verifyOtp(user: Omit<IUser, 'password'>, code: string) {
    let otpValue = await this.otpModel.findOne({ userID: user.id });
    if(!otpValue){
      throw new BadRequestException({
        message:
          'OTP has been expired!',
        error: 'Bad Request',
      });
    }
    if (otpValue.attempts > 2) {
      throw new BadRequestException("You're Otp has been expired !");
    }
    if (otpValue.oneTimePassword !== code) {
      otpValue.attempts++;
      await otpValue.save();
      throw new NotFoundException('OTP not found!');
    }
    const updatedUser = this.userModel.findByIdAndUpdate(user.id, { isEmailVerified: true }) as any;

    // Delete OTP from the database after successful verification
    const deleteOtpPromise = this.otpModel.deleteOne({ userID: user.id, oneTimePassword: code });

    // Wait for both operations to complete in parallel
    await Promise.all([updatedUser, deleteOtpPromise]);
    let payload = {};
    // console.log(opt)
    //if the email is already verified ...
    if (updatedUser.isEmailVerified) {
      payload = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tokenFor: 'forget-password',
        // profilePicture:user.profilePicture
      };
    }else{
      payload = {
        email: user.email,
        id: user.id,
        name: user.name,
        role: user.role,
        tokenFor: 'email-verification',
      };
    }
  
    const token = this.jwtService.sign(payload);
    return { message: 'OTP Verified Successfully', data: {id:user.id}, token };
  }
  async resendOtp(user: Omit<IUser, 'password'>) {

    let otpData: otp = await this.otpModel.findOne({ userID: user.id });
    // If OTP data exists, check the time difference
    if (otpData && otpData.updatedAt) {
      const timeDifference = Date.now() - otpData.updatedAt.getTime();
      // Check if the last OTP was sent less than 30 seconds ago
      if (timeDifference < 30000) {
        throw new BadRequestException(
          `You can resend the OTP only after  ${Math.round((30-timeDifference/1000))} seconds.`,
        );
      }
    }
    await this.otpModel.deleteOne({ userID: user.id });
    // Generate a new OTP
    let otp = generateOtp();
    const currentDate = new Date();
    currentDate.setMinutes(currentDate.getMinutes() + 3);
    // Create a new OTP document
    const saveOtp = new this.otpModel({
      oneTimePassword: otp,
      userID: user.id,
      expiredAt: currentDate,
    });
    // Send OTP to the user's email
    this.emailService
      .sendOtpEmail(user.email, otp, user.name)
      .then(() => {
        console.log(`OTP email sent to ${user.email}`);
      })
      .catch((error) => {
        console.error('Error sending OTP email:', error);
      });
    // Save the new OTP in the database
    await saveOtp.save();

    return { message: 'OTP sent successfully', data: {} };
  }
  async resetPassword(user: Partial<IUser>, resetPasswordDto) {
    let id = user.id;
    let userInfo = await this.userModel.findById(id).select('password');
    if (!userInfo) {
      throw new NotFoundException('User not Found!');
    }
    let isMatch = await comparePassword(
      resetPasswordDto.oldPassword,
      userInfo.password,
    );
    if (!isMatch) {
      throw new BadRequestException('Password Not Matched!');
    }
    userInfo.password = resetPasswordDto.newPassword;
    await userInfo.save();
    return { message: 'Password Updated Successfully', data: {} };
  }
  async forgetPassword(payload, forgetPasswordDto) {
    // if (payload.tokenFor === 'email-verification') {
    //   throw new BadGatewayException('Verification was for email verification!');
    // }
    if (forgetPasswordDto.password !== forgetPasswordDto.confirmPassword) {
      throw new BadRequestException(
        'Password and Confirm Password not matched!!',
      );
    }
    let user = await this.userModel.findOne({ _id: payload.id });
    // const hashedPassword = await hashPassword(forgetPasswordDto.password)
    user.password = forgetPasswordDto.password;
    await user.save();
    return { message: 'Password Updated Successfully', data: {} };
  }
  async resendOtpForForget(email: string) {
    try {
      let user = await this.userModel.findOne({ email: email });
      // Retrieve the last OTP entry for the user
      let otpData: otp = await this.otpModel.findOne({ userID: user.id });
      // If OTP data exists, check the time difference
      if (otpData && otpData.updatedAt) {
        const timeDifference = Date.now() - otpData.updatedAt.getTime();
        // Check if the last OTP was sent less than 30 seconds ago
        if (timeDifference < 30000) {
          throw new BadRequestException(
            'You can resend the OTP only after 30 seconds.',
          );
        }
      }
      await this.otpModel.deleteOne({ userID: user.id });
      // Generate a new OTP
      let otp = generateOtp();
      const currentDate = new Date();
      currentDate.setMinutes(currentDate.getMinutes() + 3);
      // Create a new OTP document
      const saveOtp = new this.otpModel({
        oneTimePassword: otp,
        userID: user.id,
        expiredAt: currentDate,
      });

      this.emailService
        .sendOtpEmail(user.email, otp, user.name)
        .then((res) => {
          console.log(res);
        })
        .catch((error) => {
          console.log("email Send Errror")
        });
      // Save the new OTP in the database
      await saveOtp.save();
      let payload = {
        id: user.id,
        email:user.email,
        role: user.role,
        tokenFor: 'forget-password',
      };
      const token = this.jwtService.sign(payload, { expiresIn: '3600s' });
      return { message: 'OTP sent successfully', data: {}, token };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}

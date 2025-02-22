import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  Request,
  NotFoundException,
  Patch,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ProfileDto } from './dto/profile.dto';
import {
  IProfile,
  InterestAndValuesAttributes,
} from './interface/profile.interface';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { Roles } from 'src/common/custom-decorator/role.decorator';

// import { LifestyleService } from 'src/lifestyle/lifestyle.service';
import { RolesGuard } from 'src/auth/guard/role-gurad';
import {
  omitProperties,
  pickProperties,
} from 'src/common/utils/omitProperties';
import { EditProfileBasicInfoDto } from './dto/editProfile.dto';
import { AddLocationDto } from './dto/edit.location.dto';
import { Types } from 'mongoose';

@Controller('profiles')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Post('')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  async createProfile(
    @Request() req,
    @Body() profileDto: ProfileDto,
  ): Promise<any> {
    let id = req.user.id;
    if (!profileDto) throw new BadRequestException('Profile Data is required!');
    profileDto.userID = id;
    return this.profileService.registerProfile(profileDto);
  }
  // READ: Find a profile by ID
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  async findProfileById(@Param('id') id: string): Promise<any> {
    return this.profileService.findProfileById(id);
  }

  // UPDATE: Update a profile by ID
  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  async updateProfile(
    @Request() req,
    @Body() editProfileBasicInfoDto: EditProfileBasicInfoDto,
  ): Promise<IProfile | null> {
    let id = req.user.profileID;
    if (!id) {
      throw new NotFoundException('User Not Found!');
    }
    return this.profileService.updateProfile(id, editProfileBasicInfoDto);
  }
  @Patch('location')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  async updateLocation(
    @Request() req,
    @Body() AddLocationDto: AddLocationDto,
  ): Promise<any> {
    let user = req.user;
    if (!user.id) {
      throw new NotFoundException('User Not Found!');
    }
    return this.profileService.updateLocation(user, AddLocationDto);
  }

  // DELETE: Delete a profile by ID
  @Delete(':id')
  async deleteProfile(@Param('id') id: string): Promise<IProfile | null> {
    return this.profileService.deleteProfile(id);
  }
}

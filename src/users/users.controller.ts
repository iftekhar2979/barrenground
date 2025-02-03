// src/user/user.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  HttpException,
  HttpStatus,
  ValidationPipe,
  BadRequestException,
  ConflictException,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
} from '@nestjs/common';
import { UserService } from './users.service';
import { IUser } from './users.interface';
import { ExceptionsHandler } from '@nestjs/core/exceptions/exceptions-handler';
import { CreateUserDto } from './dto/createUser.dto';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { Roles } from 'src/common/custom-decorator/role.decorator';
import { RolesGuard } from 'src/auth/guard/role-gurad';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from 'src/common/multer/multer.config';


@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}
  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async findAll(@Query() query: { limit: number; page: number }) {
    try {
      return this.userService.findAll(query);
    } catch (error) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
  }
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  async findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  async update(@Param('id') id: string, @Body() updateUserDto: any) {
    return this.userService.update(id, updateUserDto);
  }
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  async delete(@Param('id') id: string) {
    return this.userService.delete(id);
  }

   @Post("profile-picture")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('user')
    @UseInterceptors(FileInterceptor('file', multerConfig))
    imagesUpload(@Request() req, @UploadedFile() file: Express.Multer.File) {
      let user = req.user; // Assuming user info is in the request
      return this.userService.uploadProfilePicture(user, file);
    }
}

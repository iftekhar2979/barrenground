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
  NotFoundException,
  Patch,
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

  @Get('/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async findMe(@Request() req) {
    return this.userService.findOne(req.user.id);
  }
  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get('/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async findAll(@Query() query: { term: string; limit: string; page: string }) {
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

  @Get('')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  async getUsers(
    @Request() req,
    @Query('name') name?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    page = Math.max(Number(page), 1);
    limit = Math.max(Number(limit), 1);
    if (!req.user) {
      throw new HttpException('User Not Found!', HttpStatus.NOT_FOUND);
    }
    return await this.userService.findUsersByName(
      req.user.id,
      name,
      page,
      limit,
    );
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

  @Post('profile-picture')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user','admin')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  imagesUpload(@Request() req, @UploadedFile() file: Express.Multer.File) {
    let user = req.user; // Assuming user info is in the request
    return this.userService.uploadProfilePicture(user, file);
  }
  @Get('/info/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'admin')
  async accountInfoMe(@Request() req: any) {
    try {
      let id = req.user.id;
      return this.userService.findMyInfo(id);
    } catch (error) {
      throw new NotFoundException('Information Not Found!');
    }
  }
  @Patch('/info/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(FileInterceptor('file', multerConfig))
  async updateAccountInformation(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body() info: { name: string },
  ) {
    return this.userService.updateMe(req.user, file, info);
  }
  @Put('/info/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async updateUser(
    @Request() req,
    @Body() info: { name: string; email: string; phone: string },
  ) {
    return this.userService.update(req.user.id, info);
  }
}

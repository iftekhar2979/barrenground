const fs = require('fs');
const path = require('path');
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, mongo, ObjectId } from 'mongoose';
import { User } from './users.schema';
import { IUser } from './users.interface';
import { pagination } from 'src/common/pagination/pagination';
import { Pagination } from 'src/common/pagination/pagination.interface';
// import path, { parse } from 'path';
import { CreateUserDto } from './dto/createUser.dto';
import { FileType } from 'src/gallery/interface/gallery.interface';
import { resizeImage } from 'src/common/multer/multer.config';
import { Profile } from 'src/profile/profile.schema';
import { ResponseInterface } from 'src/auth/interface/ResponseInterface';
@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Profile.name) private profileModel: Model<Profile>,
  ) {}
  // Create a new user

  async create(createUserDto: CreateUserDto): Promise<User> {
    const newUser = new this.userModel(createUserDto);
    return newUser.save();
  }
  async createProfile(data) {
    await this.profileModel.create(data);
  }
  async updateProfilePicture(id: string, url: string): Promise<User> {
    return this.userModel.findByIdAndUpdate(
      id,
      { profilePicture: url },
      { new: true },
    );
  }
  async checkUserExistWiththeName(createUserDto: CreateUserDto): Promise<User> {
    return await this.userModel.findOne({ name: createUserDto.name });
  }
  async checkUserExistWiththeEmail(
    createUserDto: CreateUserDto,
  ): Promise<User> {
    return await this.userModel.findOne({ email: createUserDto.email });
  }
  // Get all users

  async findAll(query: {
    term: string;
    page: string;
    limit: string;
  }): Promise<{ data: User[]; pagination: Pagination }> {
    let page = parseFloat(query.page);
    let limit = parseFloat(query.limit);
    const skip = (page - 1) * limit;
    const data = await this.userModel
      .find({
        name: { $regex: new RegExp(query.term, 'i') },
        role: 'user',
      })
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
    const total = await this.userModel
      .countDocuments({
        name: { $regex: new RegExp(query.term, 'i') },
      })
      .exec();
    return { data, pagination: pagination(limit, page, total) };
  }

  async findMyInfo(id: string): Promise<any> {
    let userInfo = await this.userModel.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
        },
      },
      {
        $lookup: {
          from: 'profiles',
          localField: 'profileID',
          foreignField: '_id',
          as: 'profile',
        },
      },
      {
        $unwind: {
          path: '$profile',
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $addFields: {
          age: {
            $subtract: [{ $year: new Date() }, { $year: '$profile.dOB' }],
          },
        },
      },
      {
        $project: {
          profilePicture: 1,
          email: 1,
          age: 1,
          fullName: '$profile.fullName',
          gender: '$profile.gender',
          address: '$profile.address',
        },
      },
    ]);
    return { data: userInfo[0] };
  }

  // Find a user by ID
  async findOne(id: string): Promise<User> {
    return await this.userModel.findById(id).select('-password').exec();
  }
  async findUsersByName(
    myId: string,
    name?: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const filter: { isDeleted: boolean; role: 'user'; name?: any; _id?: any } =
      {
        isDeleted: false,
        role: 'user',
        _id: { $ne: myId }, // Exclude the current user
      };

    if (name) {
      filter.name = { $regex: new RegExp(name, 'i') };
    }

    // Execute both queries concurrently using Promise.all()
    const [users, totalUsers] = await Promise.all([
      this.userModel
        .find(filter)
        .select('profilePicture name _id')
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 })
        .limit(limit)
        .exec(),

      this.userModel.countDocuments(filter),
    ]);

    return {
      message: `${totalUsers} users found!`,
      data: users,
      pagination: pagination(limit, page, Math.ceil(totalUsers / limit)),
    };
  }

  // Update a user by ID
  async update(id: string, updateUserDto): Promise<User> {
    return this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .exec();
  }

  // Delete a user by ID
  async delete(id: string): Promise<any> {
    await this.userModel.findByIdAndUpdate(id, { isDeleted: true }).exec();
    return { message: 'Account deleted successfully', data: {} };
  }
  async uploadProfilePicture(user: User, file: FileType): Promise<any> {
    await this.updateProfilePicture(
      user.id,
      `${file.destination.split('/')[1]}/${file.filename}`,
    );
    return { message: 'Profile Picture Uploaded Successfully', data: {} };
  }

  async updateMe(
    user,
    file: FileType,
    info: { name?: string; email?: string },
  ): Promise<ResponseInterface<{}>> {
    if (!file) {
      await Promise.all([
        this.profileModel.findOneAndUpdate(
          { userID: user.id },
          { fullName: info.name },
          { new: true },
        ),
      ]);
      return {
        message: 'Information Upated Successfully',
        data: {},
        statusCode: 200,
      };
    }
    await Promise.all([
      this.updateProfilePicture(
        user.id,
        `${file.destination.split('/')[1]}/${file.filename}`,
      ),
      this.profileModel.findOneAndUpdate(
        { userID: user.id },
        { fullName: name },
        { new: true },
      ),
    ]);
    return {
      message: 'Information Upated Successfully',
      data: {},
      statusCode: 200,
    };
  }
  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }
  totalAccount() {
    return this.userModel.countDocuments({ isDeleted: false });
  }
  async updateUserDateAndTime(id: string): Promise<User | null> {
    return this.userModel
      .findByIdAndUpdate(id, { updatedAt: new Date() })
      .exec();
  }
}

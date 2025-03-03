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

  async findAll(query): Promise<{ data: User[]; pagination: Pagination }> {
    let page = parseFloat(query.page);
    let limit = parseFloat(query.limit);
    const skip = (page - 1) * limit;
    const data = await this.userModel
      .find()
      .select('-password')
      .skip(skip)
      .limit(limit)
      .exec();
    const total = await this.userModel.countDocuments().exec();
    return { data, pagination: pagination(limit, page, total) };
  }

  async findMyInfo(id: string): Promise<User> {
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
        $unwind: '$profile',
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
    return userInfo[0];
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
  async update(id: string, updateUserDto: IUser): Promise<User> {
    return this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .exec();
  }

  // Delete a user by ID
  async delete(id: string): Promise<any> {
    return this.userModel.findByIdAndDelete(id).exec();
  }
  async uploadProfilePicture(user: User, file: FileType): Promise<any> {
    console.time('Compressing Image');
    // fs.readFile(file.path)
    //   .then(async (data) => {
    //     console.log("Data",data)
    //     const resizedBuffer = await resizeImage(data, 800, 600);

    //     const tempPath = path.join(
    //       __dirname,
    //       '..',
    //       '..',
    //       'public',
    //       'uploads',
    //       file.filename,
    //     );

    //     await fs.writeFile(tempPath, resizedBuffer); // Use async write
    //     await fs.readFile(tempPath); // Use async read

    //     // Further processing here...
    //   })
    //   .catch((err) => {
    //     throw new Error('Error reading or writing file buffer: ' + err.message);
    //   });
    // console.log()
    console.log(`${file.destination.split('/')[1]}/${file.filename}`);
    console.timeEnd('Compressing Image');
    await this.updateProfilePicture(
      user.id,
      `${file.destination.split('/')[1]}/${file.filename}`,
    );
    return { message: 'Profile Picture Uploaded Successfully', data: {} };
  }

  async updateMe(user, file: FileType, name: string): Promise<ResponseInterface<{}>> {
    if(!file){
      await Promise.all([
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
}

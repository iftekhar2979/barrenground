
import { ObjectId } from 'mongodb';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProfileDto } from './dto/profile.dto'; // Import the DTO
import { IProfile } from './interface/profile.interface'; // Import the Profile interface
import { EditProfileBasicInfoDto } from './dto/editProfile.dto';
import { User } from 'src/auth/interface/jwt.info.interfact';
import { AddLocationDto } from './dto/edit.location.dto';

@Injectable()
export class ProfileService {
  constructor(
    @InjectModel('Profile') private readonly profileModel: Model<IProfile>,
    @InjectModel('User') private readonly userModel: Model<User>,
  ) {}

  async createProfile(profileDto: ProfileDto): Promise<IProfile> {
    const newProfile = new this.profileModel(profileDto);
    await newProfile.save();
    return newProfile;
  }
  async registerProfile(profileDto: ProfileDto): Promise<any> {

    const newProfile = await this.createProfile(profileDto) as any;
    // console.log("Proifle==========?",newProfile)
   await this.userModel.findByIdAndUpdate(
      profileDto.userID,
      { profileID: newProfile._id },
    );
    return { message: 'Profile Created Successfully', data: newProfile };
  }
  // READ: Find all profiles
  async findAllProfiles(): Promise<IProfile[]> {
    return this.profileModel.find().exec();
  }

  // READ: Find a profile by ID
  async findProfileById(profileId: string): Promise<any> {
    let query = [
      {
        $match: {
          _id: new ObjectId(profileId),
        },
      },
      {
        $lookup: {
          from: 'galleries',
          localField: '_id',
          foreignField: 'profileID',
          as: 'gallery',
        },
      },

      {
        $lookup: {
          from: 'lifestyles',
          localField: 'userID',
          foreignField: 'userID',
          as: 'lifestyle',
        },
      },

      {
        $addFields: {
          lifestyle: {
            $arrayElemAt: ['$lifestyle', 0], // Flatten lifestyle array
          },
        },
      },
      {
        $addFields: {
          age: {
            $dateDiff: {
              startDate: '$dOB', // Assuming dOB (Date of Birth) field exists
              endDate: new Date(),
              unit: 'year',
            },
          },
          pictures: {
            $map: {
              input: '$gallery',
              as: 'item',
              in: '$$item.imageURL',
            },
          },
        },
      },
      {
        $project: {
          // Exclude fields directly here
          lifeStyle: 0,
          createdAt: 0,
          updatedAt: 0,
          isDeleted: 0,
          __v: 0,
          location: 0,
          gallery: 0,
          userID: 0,
          galleryID: 0,
          isSubscibed: 0,
        },
      },
    ];
    let profile = await this.profileModel.aggregate(query);
    return { message: 'User Retrived Successfully', data: profile[0] };
  }

  // UPDATE: Update a profile by ID
  async updateProfile(
    profileId: string,
    profileDto: EditProfileBasicInfoDto,
  ): Promise<IProfile | null> {
    return this.profileModel
      .findByIdAndUpdate(profileId, profileDto, {
        new: true, // Return the updated document
      })
      .exec();
  }

  async updateLocation(
    user: User,
    AddLocationDto: AddLocationDto,
  ): Promise<any> {
    // Define the location object with latitude and longitude
    let location = {
      type: 'Point',
      coordinates: [
        parseFloat(AddLocationDto.longitude),
        parseFloat(AddLocationDto.latitude),
      ],
    };

    // Fetch location details from OpenCage API
    try {
      const response = await fetch(
        `https://api.opencagedata.com/geocode/v1/json?q=${AddLocationDto.latitude},${AddLocationDto.longitude}&key=54411e052e544c04b65442b11b490ae6&language=en`,
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch location data: ${response.statusText}`,
        );
      }

      const data = await response.json();

      // You can extract more specific location info here if needed
      const locationDetails = data.results[0];

      // Example: Extract formatted address and country
      const formattedAddress = locationDetails.formatted;
      const country = locationDetails.components.country;

      // Optionally, update the location object with detailed address info
      location = {
        type: 'Point',
        coordinates: [
          parseFloat(AddLocationDto.longitude),
          parseFloat(AddLocationDto.latitude),
        ],
      };
      // Update the user's profile with the new location
      await this.profileModel.findByIdAndUpdate(
        user.profileID,
        { location, country: country, address: formattedAddress },
        { new: true },
      );

      return {
        message: 'Location Updated Successfully',
        data: {
          address: formattedAddress,
          country: country,
        },
      };
    } catch (error) {
      // Handle any errors during the API call or profile update
      console.error('Error updating location:', error);
      return {
        message: 'Error updating location',
        error: error.message,
      };
    }
  }
  // DELETE: Delete a profile by ID
  async deleteProfile(profileId: string): Promise<IProfile | null> {
    return this.profileModel.findByIdAndDelete(profileId).exec();
  }
}

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Settings } from '././settings.schema';
import { ResponseInterceptor } from 'src/common/interceptors/response.interceptors';

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(Settings.name) private settingModel: Model<Settings>,
  ) {}

  async seed(seedData: any): Promise<any> {
    for (const data of seedData) {
      const existing = await this.settingModel
        .findOne({ key: data.key })
        .exec();
      if (!existing) {
        await this.settingModel.create(data);
        console.log(`Seeded: ${data.key}`);
      } else {
        console.log(`Already exists: ${data.key}`);
      }
    }
  }
  async getTermsAndConditions(): Promise<any> {
    return await this.settingModel
      .findOne({ key: 'terms_and_condition' })
      .exec();
  }

  async getAboutUs(): Promise<any> {
    return await this.settingModel.findOne({ key: 'about_us' }).exec();
  }

  async getPrivacyPolicy(): Promise<any> {
    return await this.settingModel.findOne({ key: 'privacy_policy' }).exec();
  }

  async editTermsAndConditions(content: string): Promise<void> {
    const sanitizedContent = content;
    let find = await this.settingModel.findOne({ key: 'terms_and_condition' });
 ;
    find.content = sanitizedContent;
 
    find.save();
  }

  async editAboutUs(content: string): Promise<void> {
    const sanitizedContent = content;
    let find = await this.settingModel.findOne({ key: 'about_us' });
    console.log(find);
    // await this.settingModel
    //   .updateOne(
    //     { key: 'about_us' },
    //     { value: sanitizedContent },
    //     { upsert: true ,new:true},
    //   )
    //   .exec();
    find.content = sanitizedContent;
    find.save();
  }

  async editPrivacyPolicy(content: string): Promise<void> {
    const sanitizedContent = content;
    let find = await this.settingModel.findOne({ key: 'privacy_policy' });
    console.log(find);
    find.content = sanitizedContent;
    // await this.settingModel
    //   .updateOne(
    //     { key: 'privacy_policy' },
    //     { value: sanitizedContent },
    //     { upsert: true , new:true},
    //   )
    //   .exec();
    find.save();
  }
}

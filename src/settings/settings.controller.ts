import { Controller, Get, Put, Body, HttpStatus, HttpCode } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('terms-and-conditions')
  @HttpCode(HttpStatus.OK)
  async getTermsAndConditions() {
    return await this.settingsService.getTermsAndConditions();
  }

  @Get('about-us')
  @HttpCode(HttpStatus.OK)
  async getAboutUs() {
    return await this.settingsService.getAboutUs();
  }

  @Get('privacy-policy')
  @HttpCode(HttpStatus.OK)
  async getPrivacyPolicy() {
    return await this.settingsService.getPrivacyPolicy();
  }

  @Put('terms-and-conditions')
  @HttpCode(HttpStatus.OK)
  async editTermsAndConditions(@Body('content') content: string) {
    // console.log(content)
    await this.settingsService.editTermsAndConditions(content);
    return { message: 'Terms and Conditions updated successfully',data:{} };
  }

  @Put('about-us')
  @HttpCode(HttpStatus.OK)
  async editAboutUs(@Body('content') content: string) {
    await this.settingsService.editAboutUs(content);
    return { message: 'About Us updated successfully',data:{} };
  }

  @Put('privacy-policy')
  @HttpCode(HttpStatus.OK)
  async editPrivacyPolicy(@Body('content') content: string) {
    await this.settingsService.editPrivacyPolicy(content);
    return { message: 'Privacy Policy updated successfully' ,data:{}};
  }
}

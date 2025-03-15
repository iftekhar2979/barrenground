// import { ResponseInterface } from './../common/interface/response.interface';
import { Injectable } from '@nestjs/common';
// import { IReport, Report } from './report.schema';
import { get, Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { pagination } from 'src/common/pagination/pagination';
import { ReportDto } from './dto/report.dto';
import { IReport, Report } from './report.schema';
import { ResponseInterface } from 'src/auth/interface/ResponseInterface';
// import { ReportDto } from './dto/report.dto';

@Injectable()
export class ReportService {
  constructor(@InjectModel(Report.name) private reportModel: Model<Report>) {}

  async createReport(reportDto: ReportDto): Promise<Report> {
    const report = new this.reportModel({ ...reportDto });
    return await report.save();
  }
  async getReports(limit: number, page: number): Promise<Report[]> {
    return await this.reportModel
      .find({
        userID: { $ne: null },
      })
      .skip(limit * (page - 1))
      .limit(limit)
      .sort({createdAt:-1})
      .populate({ path: 'userID', select: 'name email' })
      .populate({ path: 'reportedBy', select: 'name email' });
  }
  async getReport(id: string): Promise<IReport> {
    return (await this.reportModel.findById(id)).populate({
      path: 'userID',
      select: 'name email',
    });
  }
  async getReportByUser(userID: string): Promise<Report | any> {
    return await this.reportModel
      .find({ userID })
      .populate({ path: 'userID', select: 'name email' });
  }
  async getReportCount() {
    return await this.reportModel.countDocuments();
  }

  async createReportWithUserID(
    reportDto: ReportDto,
    userID: string,
  ): Promise<any> {
    let report = await this.reportModel.create({ ...reportDto, userID });
    return {
      message: 'Report created successfully',
      data: report,
    };
  }

  async getAllReports(
    limit: number,
    page: number,
  ): Promise<ResponseInterface<Report[]>> {
    const count = await this.reportModel.countDocuments({
      userID: { $ne: null },
    });
    console.log(count);
    const reports = await this.getReports(limit, page);
    return {
      message: 'Reports fetched successfully',
      data: reports,
      pagination: pagination(limit, page, count),
    };
  }
}

import {
    Body,
    Controller,
    Get,
    Post,
    Query,
    Request,
    UseGuards,
  } from '@nestjs/common';
  import { ReportService } from './report.service';
  import { Roles } from 'src/common/custom-decorator/role.decorator';
  import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
  import { RolesGuard } from 'src/auth/guard/role-gurad';
//   import { ReportDto } from './dto/report.dto';
  import { pagination } from 'src/common/pagination/pagination';
  import { PaginationOptions } from 'src/common/dto/pagination.dto';
import { ReportDto } from './dto/report.dto';
  
  @Controller('report')
  export class ReportController {
    constructor(private readonly reportService: ReportService) {}
  
    @Post('')
    @UseGuards(JwtAuthGuard, RolesGuard)
    createReport(@Request() req, @Body() reportDto: ReportDto) {
      let id = req.user.id;
      return this.reportService.createReport({ ...reportDto, reportedBy: id });
    }
    @Get('/all')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    getReports(@Query() pagination: PaginationOptions) {
      let { page, limit } = pagination.converter();
      return this.reportService.getAllReports(limit, page);
    }
  }
  
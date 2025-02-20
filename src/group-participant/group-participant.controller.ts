import { Controller, ForbiddenException, Get, Injectable, Param, Query, Request, UseGuards } from '@nestjs/common';
import { GroupService } from './group-participant.service';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { Roles } from 'src/common/custom-decorator/role.decorator';
import { RolesGuard } from 'src/auth/guard/role-gurad';

@Controller('participant')
export class GroupParticipantController {
  constructor(private readonly groupParticipantService: GroupService) {}
  @Get('/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  async getGroupParticipants(@Request() req, @Param('id') groupId: string) {
    console.log(groupId)
    if(!groupId){
        throw new ForbiddenException('Group Not Provided');
    }
    let data = await this.groupParticipantService.checkMyRole(groupId, req.user.id);

    if (!data) {
        throw new ForbiddenException('You are not a member of this group');
    }
   
    return {message:'User Retrived Successfully' , data: await this.groupParticipantService.checkMyRole(groupId, req.user.id)};
  }
}

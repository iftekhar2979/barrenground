import { Module } from '@nestjs/common';
import { GroupParticipantController } from './group-participant.controller';
import { GroupService } from './group-participant.service';
import { MongooseModule } from '@nestjs/mongoose';
import { GroupMember, GroupMemberSchema } from './group-participant.schema';
import { UsersModule } from 'src/users/users.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports:[
      MongooseModule.forFeature([
          // { name: Group.name, schema: GroupSchema },
          { name: GroupMember.name, schema: GroupMemberSchema },
        ]),
        JwtModule.register({
              secret: 'yourSecretKey', // You should move this to a config file or env variables
              signOptions: { expiresIn: '30d' }, // Token expiration time
            }),
        UsersModule,
        
  ],
  controllers: [GroupParticipantController],
  providers: [GroupService],
 exports: [GroupService],
})
export class GroupParticipantModule {}

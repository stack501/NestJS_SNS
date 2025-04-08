import { Controller, DefaultValuePipe, Delete, Get, Param, ParseBoolPipe, ParseIntPipe, Patch, Post, Query, UseInterceptors } from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles } from './decorator/roles.decorator';
import { RoleEnum, UsersModel } from './entity/users.entity';
import { User } from './decorator/user.decorator';
import { TransactionInterceptor } from 'src/common/interceptor/transaction.interceptor';
import { QueryRunnerDecorator } from 'src/common/decorator/query-runner.decorator';
import { QueryRunner } from 'typeorm';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthScheme } from 'src/common/const/auth-schema.const';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // @Post()
  // postUser(
  //   @Body('nickname') nickname: string,
  //   @Body('email') email: string,
  //   @Body('password') password: string,
  // ) {
  //   return this.usersService.createUser({
  //     nickname,
  //     email,
  //     password,
  //   });
  // }
  
  @Get()
  @ApiBearerAuth(AuthScheme.ACCESS)
  @ApiOperation({ 
      summary: '모든 사용자 불러오기', 
      description: 'DB에 등록된 모든 사용자를 불러옵니다.' 
  })
  @Roles(RoleEnum.ADMIN)
  getUsers() {
    return this.usersService.getAllUsers();
  }

  @Get('follow/me')
  @ApiBearerAuth(AuthScheme.ACCESS)
  @ApiOperation({ 
      summary: '팔로우한 사용자 불러오기', 
      description: '나를 팔로우한 사용자들을 불러옵니다. includeNotConfirmed가 true인 경우 -> 내가 아직 수락하지 않은 팔로우들입니다.' 
  })
  async getFollow(
    @User() user: UsersModel,
    @Query('includeNotConfirmed', new DefaultValuePipe(false), ParseBoolPipe) includeNotConfirmed: boolean,
  ) {
    return this.usersService.getFollowers(user.id, includeNotConfirmed);
  }

  @Post('follow/:id')
  @ApiBearerAuth(AuthScheme.ACCESS)
  @ApiOperation({ 
      summary: '팔로우 요청', 
      description: 'User Id에 해당하는 사용자에게 팔로우 요청하기' 
  })
  async postFollow(
    @User() user: UsersModel,
    @Param('id', ParseIntPipe) followeeId: number,
  ) {
    await this.usersService.followUser(user.id, followeeId);

    return true;
  }

  @Patch('follow/:id/confirm')
  @ApiBearerAuth(AuthScheme.ACCESS)
  @ApiOperation({ 
      summary: '팔로우 수락', 
      description: '나에게 팔로우 요청한 사용자를 수락합니다.' 
  })
  @UseInterceptors(TransactionInterceptor)
  async patchFollowConfirm(
    @User() user: UsersModel,
    @Param('id', ParseIntPipe) followerId: number,
    @QueryRunnerDecorator() qr: QueryRunner,
  ) {
    await this.usersService.confirmFollow(followerId, user.id, qr);

    await this.usersService.incrementFollowerCount(
      user.id,
      'followerCount',
      1,
      qr,
    );

    await this.usersService.incrementFollowerCount(
      followerId,
      'followeeCount',
      1,
      qr,
    );

    return true;
  }

  @Delete('follow/:id')
  @ApiBearerAuth(AuthScheme.ACCESS)
  @ApiOperation({ 
      summary: '팔로우 삭제', 
      description: '나에게 팔로우 되어있는 사용자를 삭제합니다.' 
  })
  @UseInterceptors(TransactionInterceptor)
  async deleteFollow(
    @User() user: UsersModel,
    @Param('id', ParseIntPipe) followeeId: number,
    @QueryRunnerDecorator() qr: QueryRunner,
  ) {
    await this.usersService.deleteFollow(user.id, followeeId);

    await this.usersService.decrementFollowerCount(
      user.id,
      'followerCount',
      1,
      qr,
    );

    await this.usersService.decrementFollowerCount(
      followeeId,
      'followeeCount',
      1,
      qr,
    );

    return true;
  }
}

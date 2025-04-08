import { Controller, DefaultValuePipe, Delete, Get, Param, ParseBoolPipe, ParseIntPipe, Patch, Post, Query, UseInterceptors } from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles } from './decorator/roles.decorator';
import { RoleEnum } from './entity/users.entity';
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
    @User('id') userId: number,
    @Query('includeNotConfirmed', new DefaultValuePipe(false), ParseBoolPipe) includeNotConfirmed: boolean,
  ) {
    return this.usersService.getFollowers(userId, includeNotConfirmed);
  }

  @Post('follow/:id')
  @ApiBearerAuth(AuthScheme.ACCESS)
  @ApiOperation({ 
      summary: '팔로우 요청', 
      description: 'User Id에 해당하는 사용자에게 팔로우 요청하기' 
  })
  async postFollow(
    @User('id') userId: number,
    @Param('id', ParseIntPipe) followeeId: number,
  ) {
    await this.usersService.followUser(userId, followeeId);

    return true;
  }

  @Delete('follow/:id/cancel')
  @ApiBearerAuth(AuthScheme.ACCESS)
  @ApiOperation({ 
      summary: '팔로우 요청 취소', 
      description: '내가 요청한 팔로우를 취소합니다.' 
  })
  @UseInterceptors(TransactionInterceptor)
  async deleteFollowCancel(
    @User('id') userId: number,
    @Param('id', ParseIntPipe) followeeId: number,
    @QueryRunnerDecorator() qr: QueryRunner,
  ) {
    await this.usersService.deleteFollow(userId, followeeId, qr, false);

    return true;
  }

  @Get('follow/me/requests')
  @ApiBearerAuth(AuthScheme.ACCESS)
  @ApiOperation({ 
      summary: '팔로우 요청 보기', 
      description: '내가 요청한 미수락된 팔로우들을 확인합니다.' 
  })
  async getRequestsFollow(
    @User('id') userId: number,
  ) {
    const existing = await this.usersService.getRequestAllFollowee(userId);

    return existing;
  }

  @Patch('follow/:id/confirm')
  @ApiBearerAuth(AuthScheme.ACCESS)
  @ApiOperation({ 
      summary: '팔로우 수락', 
      description: '나에게 팔로우 요청한 사용자를 수락합니다.' 
  })
  @UseInterceptors(TransactionInterceptor)
  async patchFollowConfirm(
    @User('id') userId: number,
    @Param('id', ParseIntPipe) followerId: number,
    @QueryRunnerDecorator() qr: QueryRunner,
  ) {
    await this.usersService.confirmFollow(followerId, userId, qr);

    await this.usersService.incrementFollowerCount(
      userId,
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
      summary: '언팔로우', 
      description: '내가 팔로우 중인 사용자를 언팔로우합니다.' 
  })
  @UseInterceptors(TransactionInterceptor)
  async deleteFollow(
    @User('id') userId: number,
    @Param('id', ParseIntPipe) followeeId: number,
    @QueryRunnerDecorator() qr: QueryRunner,
  ) {
    await this.usersService.deleteFollow(userId, followeeId);

    await this.usersService.decrementFollowerCount(
      userId,
      'followeeCount',
      1,
      qr,
    );

    await this.usersService.decrementFollowerCount(
      followeeId,
      'followerCount',
      1,
      qr,
    );

    return true;
  }
}

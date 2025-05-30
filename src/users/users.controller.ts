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

/**
 * 사용자 관련 API 엔드포인트를 제공하는 컨트롤러
 * 
 * 사용자 조회, 팔로우 관리 등의 엔드포인트를 처리합니다.
 */
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * 모든 사용자 목록을 조회합니다
   * @returns 모든 사용자 목록
   */
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

  /**
   * 사용자의 팔로워 목록을 조회합니다
   * @param userId 로그인된 사용자 ID
   * @param includeNotConfirmed 미확인 팔로우 포함 여부
   * @returns 팔로워 목록
   */
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

  /**
   * 특정 사용자를 팔로우합니다
   * @param userId 로그인된 사용자 ID
   * @param followeeId 팔로우할 사용자 ID
   * @returns 성공 여부
   */
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

  /**
   * 팔로우 요청을 취소합니다
   * @param userId 로그인된 사용자 ID
   * @param followeeId 팔로우 요청을 취소할 사용자 ID
   * @param qr QueryRunner 인스턴스
   * @returns 성공 여부
   */
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

  /**
   * 사용자가 요청한 팔로우 목록을 조회합니다
   * @param userId 로그인된 사용자 ID
   * @returns 팔로우 요청 목록
   */
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

  /**
   * 팔로우 요청을 수락합니다
   * @param userId 로그인된 사용자 ID
   * @param followerId 팔로우를 요청한 사용자 ID
   * @param qr QueryRunner 인스턴스
   * @returns 성공 여부
   */
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

  /**
   * 팔로우 관계를 삭제합니다 (언팔로우)
   * @param userId 로그인된 사용자 ID
   * @param followeeId 언팔로우할 사용자 ID
   * @param qr QueryRunner 인스턴스
   * @returns 성공 여부
   */
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

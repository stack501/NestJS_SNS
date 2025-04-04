import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UsersModel } from './entity/users.entity';
import { QueryRunner, Repository } from 'typeorm';
import { UserFollowersModel } from './entity/user-followers.entity';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(UsersModel)
        private readonly usersRepository: Repository<UsersModel>,
        @InjectRepository(UserFollowersModel)
        private readonly userFollowersRepository: Repository<UserFollowersModel>,
    ) {}

    getUsersRepository(qr?: QueryRunner) {
        return qr ? qr.manager.getRepository<UsersModel>(UsersModel) : this.usersRepository;
    }

    getUserFollowersRepository(qr?: QueryRunner) {
        return qr ? qr.manager.getRepository<UserFollowersModel>(UserFollowersModel) : this.userFollowersRepository;
    }

    async createUser(user: Pick<UsersModel, 'email' | 'nickname' | 'password'>) {
        // 1) 닉네임 중복이 없는지 확인
        // exist() -> 만약 조건에 해당되는 값이 있으면 true 반환
        const nicknameExists = await this.usersRepository.exists({
            where: {
                nickname: user.nickname,
            }
        });

        if(nicknameExists) {
            throw new BadRequestException('이미 존재하는 nickname 입니다!');
        }

        const emailExists = await this.usersRepository.exists({
            where: {
                email: user.email,
            }
        });

        if(emailExists) {
            throw new BadRequestException('이미 존재하는 email 입니다!');
        }

        const userObj = this.usersRepository.create({
            nickname: user.nickname,
            email: user.email,
            password: user.password,
        });

        const newUser = await this.usersRepository.save(userObj);

        return newUser;
    }

    async getAllUsers() {
        return this.usersRepository.find();
    }

    async getUserByEmail(email: string) {
        return this.usersRepository.findOne({
            where: {
                email,
            },
        });
    }

    async followUser(followerId: number, followeeId: number, qr?: QueryRunner) {
        const repository = this.getUserFollowersRepository(qr);

        await repository.save({
            follower: {
                id: followerId,
            },
            followee: {
                id: followeeId,
            }
        });

        return true;
    }

    async getFollowers(userId: number, includeNotConfirmed: boolean) {
        const where = {
            followee: {
                id: userId,
            },
        }

        if(!includeNotConfirmed) {
            where['isConfirmed'] = true;
        }
        
        const result = await this.userFollowersRepository.find({
            where,
            relations: {
                follower: true,
                followee: true,
            }    
        });

        return result.map((x) => ({
            id: x.follower.id,
            nickname: x.follower.nickname,
            email: x.follower.email,
            isConfirmed: x.isConfirmed,
        }));
    }

    async confirmFollow(followerId: number, followeeId: number, qr?: QueryRunner) {
        const repository = this.getUserFollowersRepository(qr);

        const existing = await repository.findOne({
            where: {
                follower: {
                    id: followerId,
                },
                followee: {
                    id: followeeId,
                }
            },
            relations: {
                follower: true,
                followee: true,
            }
        });

        if(!existing) {
            throw new BadRequestException(
                `존재하지 않는 팔로우 요청입니다.`
            );
        }

        await repository.save({
            ...existing,
            isConfirmed: true,
        });

        return true;
    }

    async deleteFollow(followerId: number, followeeId: number, qr?: QueryRunner) {
        const repository = this.getUserFollowersRepository(qr);

        await repository.delete({
            follower: {
                id: followerId,
            },
            followee: {
                id: followeeId,
            },
        });

        return true;
    }

    async incrementFollowerCount(
        userId: number,
        fieldName: keyof Pick<UsersModel, 'followerCount' | 'followeeCount'>,
        incrementCount: number,
        qr?: QueryRunner,
      ) {
        const usersRepository = this.getUsersRepository(qr);
    
        await usersRepository.increment(
          {
            id: userId,
          },
          fieldName,
          incrementCount,
        );
      }

      async decrementFollowerCount(
        userId: number,
        fieldName: keyof Pick<UsersModel, 'followerCount' | 'followeeCount'>,
        decrementCount: number,
        qr?: QueryRunner,
      ) {
        const usersRepository = this.getUsersRepository(qr);
    
        await usersRepository.decrement(
          {
            id: userId,
          },
          fieldName,
          decrementCount,
        );
      }
}

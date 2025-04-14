import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UsersModel } from './entity/users.entity';
import { QueryRunner, Repository } from 'typeorm';
import { UserFollowersModel } from './entity/user-followers.entity';
import { ProviderData } from 'src/common/interfaces/provider-data.interface';
import { AuthProvider } from 'src/common/enums/auth-provider.enum';

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

    async checkIfUserExists(id: number) {
        const exists = this.getUsersRepository().exists({
            where: {
                id,
            },
        })

        return exists;
    }

    async createUser(user: Partial<UsersModel>) {
        // 1) 닉네임 중복이 없는지 확인
        // exist() -> 만약 조건에 해당되는 값이 있으면 true 반환
        if (user.nickname !== null) {
            const nicknameExists = await this.usersRepository.exists({
                where: {
                    nickname: user.nickname,
                }
            });

            if(nicknameExists) {
                throw new BadRequestException('이미 존재하는 nickname 입니다!');
            }
        }

        if (user.email !== null) { // email이 존재할 때만 중복 검사를 진행
            const emailExists = await this.usersRepository.exists({
                where: {
                    email: user.email,
                }
            });
            if (emailExists) {
                throw new BadRequestException('이미 존재하는 email 입니다!');
            }
        }
        const userObj = this.usersRepository.create({
            nickname: user.nickname,
            email: user.email,
            password: user.password,
            google: user.google,
            kakao: user.kakao,
        });

        const newUser = await this.usersRepository.save(userObj);

        return newUser;
    }

    async findOrCreateUserByProvider({
        email,
        nickname,
        providerId,
        providerKey,
      }: ProviderData): Promise<UsersModel> {
        // provider 필드에 맞는 사용자를 찾음 (예: user.google 또는 user.kakao)
        let user = await this.usersRepository.findOne({ where: { [providerKey]: providerId } });
        
        // 사용자가 없으면, 이메일로도 찾음 (이메일이 있으면)
        if (!user && email) {
          user = await this.usersRepository.findOne({ where: { email } });
        }
        
        // 예를 들어, 카카오의 경우 임시 이메일 설정 (요구사항에 따라 다른 provider도 처리 가능)
        if (providerKey === AuthProvider.KAKAO && !email) {
          email = 'stack@test.com';
        }
        
        // 사용자가 없으면 신규 생성
        if (!user) {
          const createData: Partial<UsersModel> = {
            email,
            nickname: nickname || email,  // 닉네임이 없으면 email 등을 기본값으로 사용
            password: '',                // 소셜 로그인은 패스워드 필요 없음
            [providerKey]: providerId,
          };
          user = await this.createUser(createData);
        } else if (!user[providerKey]) {
          // 기존에 이메일로 가입된 사용자의 경우 해당 provider 연동이 안 되어있으면, 업데이트
          user[providerKey] = providerId;
          await this.usersRepository.save(user);
        }
        
        return user;
    }

    async findOrCreateByGoogle({
        email,
        displayName,
        googleId,
      }: {
        email: string;
        displayName: string;
        googleId: string;
      }): Promise<UsersModel> {
        return await this.findOrCreateUserByProvider({
          email,
          nickname: displayName,
          providerId: googleId,
          providerKey: AuthProvider.GOOGLE,
        });
    }
      
    async findOrCreateByKakao({
        email,
        nickname,
        kakaoId,
      }: {
        email: string;
        nickname: string;
        kakaoId: string;
      }): Promise<UsersModel> {
        return await this.findOrCreateUserByProvider({
          email,
          nickname,
          providerId: kakaoId,
          providerKey: AuthProvider.KAKAO,
        });
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

    async getRequestAllFollowee(followerId: number, qr?: QueryRunner) {
        const repository = this.getUserFollowersRepository(qr);

        const existing = await repository.find({
            where: {
                follower: { id: followerId},
            },
            relations: {
                follower: true,
                followee: true,
            },
        });

        return existing;
    }

    async getExistingFollow(followerId: number, followeeId: number, qr?: QueryRunner, isConfirmed: boolean = true) {
        const repository = this.getUserFollowersRepository(qr);

        const existing = await repository.findOne({
            where: {
                follower: {
                    id: followerId,
                },
                followee: {
                    id: followeeId,
                },
                isConfirmed,
            },
            relations: {
                follower: true,
                followee: true,
            }
        });

        return { repository, existing };
    }

    async confirmFollow(followerId: number, followeeId: number, qr?: QueryRunner) {
        const { repository, existing } = await this. getExistingFollow(followerId, followeeId, qr);

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

    async deleteFollow(followerId: number, followeeId: number, qr?: QueryRunner, isConfirmed: boolean = true) {
        const { repository, existing } = await this. getExistingFollow(followerId, followeeId, qr, isConfirmed);

        if (!existing) {
            throw new BadRequestException(
                `팔로우 하지 않은 사용자입니다.`
            );
        }

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

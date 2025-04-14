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

    async findOrCreateByGoogle({
        email,
        displayName,
        googleId,
    }: {
        email: string;
        displayName: string;
        googleId: string;
    }): Promise<UsersModel> {
        // 먼저, google 필드가 googleId와 매칭되는 사용자가 있는지 확인
        let user = await this.usersRepository.findOne({ where: { google: googleId } });
        
        // 만약 사용자가 없다면, email로도 찾을 수 있다면 두 가지를 병합할 수도 있음
        if (!user && email) {
            user = await this.usersRepository.findOne({ where: { email } });
        }
    
        // 사용자가 존재하지 않는다면 신규 생성
        if (!user) {
            user = await this.createUser({
                email,
                nickname: displayName,
                password: '',       // 구글 로그인은 패스워드가 필요 없으므로 빈 문자열 지정
                google: googleId,   // 구글 고유 식별자 저장
            });
        } else if (!user.google) {
            // 기존에 email로 가입된 사용자의 경우, 구글 연동이 안 되어 있다면 google 필드 업데이트
            user.google = googleId;
            await this.usersRepository.save(user);
        }
    
        return user;
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
        // 먼저, kako 필드가 kakaoId와 매칭되는 사용자가 있는지 확인
        let user = await this.usersRepository.findOne({ where: { kakao: kakaoId } });
        
        // 만약 사용자가 없다면, email로도 찾을 수 있다면 두 가지를 병합할 수도 있음
        if (!user && email) {
            user = await this.usersRepository.findOne({ where: { email } });
        }

        //todo: 카카오 임시로 이메일 설정
        if (!email) {
            email = 'stack@test.com';
        }
    
        // 사용자가 존재하지 않는다면 신규 생성
        if (!user) {
            user = await this.createUser({
                email,
                nickname: nickname,
                password: '',       // 카카오 로그인은 패스워드가 필요 없으므로 빈 문자열 지정
                kakao: kakaoId,   // 카카오 고유 식별자 저장
            });
        } else if (!user.kakao) {
            // 기존에 email로 가입된 사용자의 경우, 구글 연동이 안 되어 있다면 google 필드 업데이트
            user.kakao = kakaoId;
            await this.usersRepository.save(user);
        }
    
        return user;
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

import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UsersModel } from './entity/users.entity';
import { QueryRunner, Repository } from 'typeorm';
import { UserFollowersModel } from './entity/user-followers.entity';
import { ProviderData } from 'src/common/interfaces/provider-data.interface';
import { AuthProvider } from 'src/common/enums/auth-provider.enum';

/**
 * 사용자 관련 비즈니스 로직을 처리하는 서비스
 * 
 * 사용자의 생성, 조회, 팔로우 관리 등의 기능을 제공합니다.
 */
@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(UsersModel)
        private readonly usersRepository: Repository<UsersModel>,
        @InjectRepository(UserFollowersModel)
        private readonly userFollowersRepository: Repository<UserFollowersModel>,
    ) {}

    /**
     * QueryRunner를 이용해 UsersModel 리포지토리를 가져옵니다
     * @param qr 선택적 QueryRunner
     * @returns UsersModel의 Repository
     */
    getUsersRepository(qr?: QueryRunner) {
        return qr ? qr.manager.getRepository<UsersModel>(UsersModel) : this.usersRepository;
    }

    /**
     * QueryRunner를 이용해 UserFollowersModel 리포지토리를 가져옵니다
     * @param qr 선택적 QueryRunner
     * @returns UserFollowersModel의 Repository
     */
    getUserFollowersRepository(qr?: QueryRunner) {
        return qr ? qr.manager.getRepository<UserFollowersModel>(UserFollowersModel) : this.userFollowersRepository;
    }

    /**
     * 사용자 존재 여부를 확인합니다
     * @param id 확인할 사용자 ID
     * @returns 사용자 존재 여부
     */
    async checkIfUserExists(id: number) {
        const exists = this.getUsersRepository().exists({
            where: {
                id,
            },
        })

        return exists;
    }

    /**
     * 새로운 사용자를 생성합니다
     * @param user 생성할 사용자 정보
     * @returns 생성된 사용자 객체
     * @throws BadRequestException 닉네임이나 이메일이 중복될 경우
     */
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

    /**
     * 제공자(소셜 로그인) 정보로 사용자를 찾거나 생성합니다
     * @param providerData 제공자 데이터
     * @returns 찾거나 생성된 사용자 객체
     */
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

    /**
     * Google 정보로 사용자를 찾거나 생성합니다
     * @param googleData Google 사용자 정보
     * @returns 찾거나 생성된 사용자 객체
     */
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
      
    /**
     * Kakao 정보로 사용자를 찾거나 생성합니다
     * @param kakaoData Kakao 사용자 정보
     * @returns 찾거나 생성된 사용자 객체
     */
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

    /**
     * 모든 사용자를 조회합니다
     * @returns 모든 사용자 목록
     */
    async getAllUsers() {
        return this.usersRepository.find();
    }

    /**
     * 이메일로 사용자를 조회합니다
     * @param email 조회할 이메일
     * @returns 조회된 사용자 객체 또는 undefined
     */
    async getUserByEmail(email: string) {
        return this.usersRepository.findOne({
            where: {
                email,
            },
        });
    }

    /**
     * 사용자를 팔로우합니다
     * @param followerId 팔로우하는 사용자 ID
     * @param followeeId 팔로우 당하는 사용자 ID
     * @param qr 선택적 QueryRunner
     * @returns 성공 여부
     */
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

    /**
     * 사용자의 팔로워 목록을 조회합니다
     * @param userId 사용자 ID
     * @param includeNotConfirmed 미확인된 팔로우 요청 포함 여부
     * @returns 팔로워 목록
     */
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

    /**
     * 사용자의 모든 팔로이 요청 목록을 조회합니다
     * @param followerId 팔로우하는 사용자 ID
     * @param qr 선택적 QueryRunner
     * @returns 팔로이 요청 목록
     */
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

    /**
     * 기존 팔로우 관계를 조회합니다
     * @param followerId 팔로우하는 사용자 ID
     * @param followeeId 팔로우 당하는 사용자 ID
     * @param qr 선택적 QueryRunner
     * @param isConfirmed 확인된 팔로우만 조회할지 여부
     * @returns 리포지토리와 조회된 팔로우 관계
     */
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

    /**
     * 팔로우 요청을 확인(수락)합니다
     * @param followerId 팔로우하는 사용자 ID
     * @param followeeId 팔로우 당하는 사용자 ID
     * @param qr 선택적 QueryRunner
     * @returns 성공 여부
     * @throws BadRequestException 존재하지 않는 팔로우 요청일 경우
     */
    async confirmFollow(followerId: number, followeeId: number, qr?: QueryRunner) {
        const { repository, existing } = await this. getExistingFollow(followerId, followeeId, qr, false);

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

    /**
     * 팔로우를 삭제(취소)합니다
     * @param followerId 팔로우하는 사용자 ID
     * @param followeeId 팔로우 당하는 사용자 ID
     * @param qr 선택적 QueryRunner
     * @param isConfirmed 확인된 팔로우만 삭제할지 여부
     * @returns 성공 여부
     * @throws BadRequestException 팔로우 관계가 존재하지 않을 경우
     */
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

    /**
     * 사용자의 팔로워/팔로이 카운트를 증가시킵니다
     * @param userId 사용자 ID
     * @param fieldName 증가시킬 필드명
     * @param incrementCount 증가시킬 값
     * @param qr 선택적 QueryRunner
     */
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

    /**
     * 사용자의 팔로워/팔로이 카운트를 감소시킵니다
     * @param userId 사용자 ID
     * @param fieldName 감소시킬 필드명
     * @param decrementCount 감소시킬 값
     * @param qr 선택적 QueryRunner
     */
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

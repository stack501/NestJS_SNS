import { BaseModel } from "src/common/entity/base.entity";
import { Column, Entity, ManyToOne } from "typeorm";
import { UsersModel } from "./users.entity";

/**
 * 사용자 팔로워 관계 엔티티 (UserFollowersModel)
 * 
 * 사용자 간의 팔로우 관계를 나타내는 중간 테이블 엔티티입니다.
 * BaseModel을 상속받습니다.
 */
@Entity()
export class UserFollowersModel extends BaseModel {
    /**
     * 팔로우를 하는 사용자 (팔로워)
     * 
     * UsersModel과의 다대일(ManyToOne) 관계입니다.
     * 이 관계에서 'follower'는 팔로우를 신청하거나 팔로우하고 있는 주체를 나타냅니다.
     * UsersModel의 'followers' 필드와 연결됩니다.
     */
    @ManyToOne(() => UsersModel, (user) => user.followers)
    follower: UsersModel;

    /**
     * 팔로우를 받는 사용자 (팔로이)
     * 
     * UsersModel과의 다대일(ManyToOne) 관계입니다.
     * 이 관계에서 'followee'는 팔로우 대상이 되는 주체를 나타냅니다.
     * UsersModel의 'followees' 필드와 연결됩니다.
     */
    @ManyToOne(() => UsersModel, (user) => user.followees)
    followee: UsersModel;

    /**
     * 팔로우 확정 여부
     * 
     * 팔로우 요청이 수락되었는지 여부를 나타냅니다.
     * 기본값은 false (미확정) 입니다.
     * 비공개 계정의 팔로우 요청/수락 기능 등에 사용될 수 있습니다.
     */
    @Column({
        default: false,
    })
    isConfirmed: boolean;
}
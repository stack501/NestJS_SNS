import { Field, ID, ObjectType } from "@nestjs/graphql";
import { CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

/**
 * 기본 모델 추상 클래스
 * 모든 엔티티가 공통으로 가져야 할 기본 필드들을 정의
 * GraphQL 스키마에서도 사용 가능
 */
@ObjectType()
export abstract class BaseModel {
    /**
     * 기본 키 (Primary Key)
     * 자동 증가되는 고유 식별자
     */
    @Field(() => ID)
    @PrimaryGeneratedColumn()
    id: number;

    /**
     * 수정일시
     * 데이터가 수정될 때마다 자동으로 업데이트
     */
    @Field()
    @UpdateDateColumn()
    updatedAt: Date;

    /**
     * 생성일시
     * 데이터가 처음 생성될 때 자동으로 설정
     */
    @Field()
    @CreateDateColumn()
    createdAt: Date;
}
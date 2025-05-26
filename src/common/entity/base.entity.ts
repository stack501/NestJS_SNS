import { Field, ID, ObjectType } from "@nestjs/graphql";
import { CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@ObjectType()
export abstract class BaseModel {
    @Field(() => ID)
    @PrimaryGeneratedColumn()
    id: number;

    @Field()
    @UpdateDateColumn()
    updatedAt: Date;

    @Field()
    @CreateDateColumn()
    createdAt: Date;
}
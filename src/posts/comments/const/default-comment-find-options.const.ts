import { FindManyOptions } from "typeorm";
import { CommentsModel } from "../entity/comments.entity";

export const DEFAULT_COMMENT_FIND_OPTIONS: FindManyOptions<CommentsModel> = {
    relations: {
        author: true,
        post: true,
    },
    select: {
        author: {
            id: true,
            nickname: true,
        },
        post: {
            id: true,
        }
    }
}
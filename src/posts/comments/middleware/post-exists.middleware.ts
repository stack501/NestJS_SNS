import { BadRequestException, Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { PostsService } from "src/posts/posts.service";

/**
 * 포스트 존재 여부를 확인하는 미들웨어
 * 
 * @description 요청 파라미터에서 postId를 추출하여 해당 포스트가 존재하는지 확인합니다.
 * 포스트가 존재하지 않으면 BadRequestException을 발생시킵니다.
 */
@Injectable()
export class PostExistsMiddleware implements NestMiddleware {
    constructor(
        private readonly postService: PostsService,
    ) {}

    /**
     * 미들웨어 실행 메서드
     * 
     * @param req - Express 요청 객체
     * @param res - Express 응답 객체  
     * @param next - 다음 미들웨어로 진행하는 함수
     * @throws {BadRequestException} Post ID가 없거나 포스트가 존재하지 않을 때
     */
    async use(req: Request, res: Response, next: NextFunction) {
        const postId = req.params.postId;

        if(!postId) {
            throw new BadRequestException(
                'Post ID 파라미터는 필수입니다.'
            );
        }

        const exists = await this.postService.checkPostExistsById(parseInt(postId));

        if(!exists) {
            throw new BadRequestException(
                'Post가 존재하지 않습니다.'
            );
        }

        next();
    }
}
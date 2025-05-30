import { Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction } from "express";

/**
 * 요청 로그 미들웨어
 * 
 * @description 들어오는 HTTP 요청의 메서드, URL, 시간을 콘솔에 로그로 출력합니다.
 */
@Injectable()
export class LogMiddleware implements NestMiddleware {
    /**
     * 미들웨어 실행 메서드
     * 
     * @param req - Express 요청 객체
     * @param res - Express 응답 객체
     * @param next - 다음 미들웨어로 진행하는 함수
     */
    use(req: Request, res: Response, next: NextFunction) {
        console.log(`[REQ] ${req.method} ${req.url} ${new Date().toLocaleString('kr')}`);

        next();
    }
}
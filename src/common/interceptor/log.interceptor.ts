import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, tap } from "rxjs";

@Injectable()
export class LogInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> {
        /**
         * 요청이 들어올 때 Req 요청이 들어온 타임스탬프를 찍는다.
         * [REQ] {요청 path} {요청 시간}
         * 
         * 응답 시 다시 타임스탬프를 찍는다.
         * [RES] {요청 path} {응답 시간} {얼마나 걸렸는지 ms}
         * 
         * return 전까지는 인터셉터전 요청에서 실행
         */

        const now = new Date();

        const req = context.switchToHttp().getRequest();

        // /posts
        // /common/image
        const path = req.originalUrl;

        // [REQ] {요청 path} {요청 시간}
        console.log(`[REQ] ${path} ${now.toLocaleString('kr')}`)

        /**
         * return next.handle()을 실행하는 순간
         * 라우트의 로직이 전부 실행되고 응답이 반환된다.
         * observable로 반환
         */
        return next
            .handle()
            .pipe(
                tap(
                    // [RES] {요청 path} {응답 시간} {얼마나 걸렸는지 ms}
                    () => console.log(`[RES] ${path} ${new Date().toLocaleDateString('kr')} ${new Date().getMilliseconds() - now.getMilliseconds()} ms`),
                ),
                // tap은 변형하지 않고 모니터링하는 함수
                // tap(
                //     (observable) => console.log(observable),
                // ),
                // // 변형이 가능한 함수
                // map(
                //     (observable) => {
                //         return {
                //             message: '응답이 변경 되었습니다.',
                //             response: observable,
                //         }
                //     }
                // ),
            );
    }
}
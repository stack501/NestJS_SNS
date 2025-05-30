/* eslint-disable @typescript-eslint/no-misused-promises */
import { CallHandler, ExecutionContext, Injectable, InternalServerErrorException, NestInterceptor } from "@nestjs/common";
import { catchError, Observable, tap } from "rxjs";
import { DataSource } from "typeorm";

/**
 * 데이터베이스 트랜잭션을 자동으로 관리하는 인터셉터
 * 
 * 이 인터셉터는 HTTP 요청 처리 중에 데이터베이스 트랜잭션을 시작하고,
 * 요청이 성공적으로 완료되면 커밋하고, 실패하면 롤백합니다.
 * 
 * **주요 기능:**
 * - 요청 시작 시 자동으로 트랜잭션 시작
 * - 요청 성공 시 자동 커밋
 * - 요청 실패 시 자동 롤백
 * - 쿼리 러너 자동 해제
 * 
 * **사용법:**
 * ```typescript
 * @UseInterceptors(TransactionInterceptor)
 * @Controller('users')
 * export class UsersController {
 *   // 컨트롤러 메서드들이 자동으로 트랜잭션 내에서 실행됩니다
 * }
 * ```
 * 
 * **주의사항:**
 * - 트랜잭션 내에서 실행되는 모든 데이터베이스 작업은 req.queryRunner를 사용해야 합니다
 * - 중첩된 트랜잭션은 지원하지 않습니다
 * 
 * @author 개발팀
 * @since 1.0.0
 */
@Injectable()
export class TransactionInterceptor implements NestInterceptor {
    /**
     * TransactionInterceptor 생성자
     * 
     * @param dataSource TypeORM DataSource 인스턴스 - 데이터베이스 연결 및 쿼리 러너 생성을 담당
     */
    constructor(
        private readonly dataSource: DataSource,
    ){}

    /**
     * 인터셉터의 핵심 메서드 - 트랜잭션을 관리하며 요청을 처리합니다
     * 
     * **처리 과정:**
     * 1. 쿼리 러너 생성 및 연결
     * 2. 트랜잭션 시작
     * 3. Request 객체에 쿼리 러너 주입
     * 4. 요청 처리 파이프라인 실행
     * 5. 성공 시 커밋, 실패 시 롤백
     * 6. 쿼리 러너 해제
     * 
     * @param context 실행 컨텍스트 - HTTP 요청/응답 정보에 접근할 수 있는 NestJS 컨텍스트
     * @param next 다음 핸들러 - 실제 컨트롤러 메서드를 호출하는 핸들러
     * 
     * @returns Promise<Observable<any>> 처리된 응답을 포함하는 Observable을 반환하는 Promise
     * 
     * @throws InternalServerErrorException 트랜잭션 처리 중 오류가 발생한 경우
     * 
     * @example
     * ```typescript
     * // 컨트롤러에서 쿼리 러너 사용
     * async createUser(req: Request) {
     *   const queryRunner = req.queryRunner;
     *   return await this.userRepository.save(userData, { queryRunner });
     * }
     * ```
     */
    async intercept(context: ExecutionContext, next: CallHandler<any>): Promise<Observable<any>> {
        const req = context.switchToHttp().getRequest();
        /**
         * 트랜잭션과 관련된 모든 쿼리를 담당할
         * 쿼리 러너를 생성한다.
         */
        const qr = this.dataSource.createQueryRunner();

        // 쿼리 러너에 연결한다.
        await qr.connect();

        /**
         * 쿼리 러너에서 트랜잭션을 시작한다.
         * 이 시점부터 같은 쿼리 러너를 사용하면, 트랜잭션 안에서 데이터베이스 액션을 실행할 수 있다.
         */
        await qr.startTransaction();

        req.queryRunner = qr;

        return next.handle().pipe(
            catchError(
                async (e) => {
                    await qr.rollbackTransaction();
                    await qr.release();

                    throw new InternalServerErrorException(e.message);
                }
            ),
            tap(async () => {
                await qr.commitTransaction();
                await qr.release();
            })
        )
    }
}
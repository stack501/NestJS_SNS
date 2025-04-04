import { createParamDecorator, ExecutionContext, InternalServerErrorException } from "@nestjs/common";
import { QueryRunner } from "typeorm";

export const QueryRunnerDecorator = createParamDecorator((data, context: ExecutionContext) => {
    const req = context.switchToHttp().getRequest();

    if(!req.queryRunner) {
        throw new InternalServerErrorException(
            `QueryRunner Decorator를 사용하려면 TransactionInterceptor를 적용해야 합니다.`
        );
    }

    return req.queryRunner as QueryRunner;
})
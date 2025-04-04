import { createParamDecorator, ExecutionContext, InternalServerErrorException } from "@nestjs/common";
import { UsersModel } from "../entity/users.entity";

export const User = createParamDecorator((data: keyof UsersModel | undefined, context: ExecutionContext) => {
    const req = context.switchToHttp().getRequest();

    const user = req.user as UsersModel;

    /**
     * User Decorator는 AccessTokenGuard와 같이 사용하므로
     * user가 없는 경우는 서버측에 문제가 있는 경우이다.
     */
    if(!user) {
        throw new InternalServerErrorException('User 데코레이터는 AccessTokenGuard와 함께 사용해야 합니다. Request에 user 프로퍼티가 존재하지 않습니다.');
    }

    if(data) {
        return user[data];
    }

    return user;
})
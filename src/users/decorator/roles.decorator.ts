import { SetMetadata } from "@nestjs/common";
import { RoleEnum } from "../entity/users.entity";

export const ROLES_KEY = 'user_roles';

// @Rolse(RolseEnum.ADMIN) -> 데코레이터 시 관리자가 아니면 사용할 수 없음
export const Roles = (role: RoleEnum) => SetMetadata(ROLES_KEY, role);
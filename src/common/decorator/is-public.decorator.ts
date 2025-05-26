import { SetMetadata } from '@nestjs/common';
import { IsPublicEnum } from '../const/is-public.const';

export const IS_PUBLIC_KEY = 'is_public';

export const IsPublic = (status: IsPublicEnum) => SetMetadata(IS_PUBLIC_KEY, status);
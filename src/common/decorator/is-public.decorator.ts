import { SetMetadata } from '@nestjs/common';
import { IsPublicEnum } from '../const/is-public.const';

export const ISPUBLIC_KEY = 'is_public';

export const IsPublic = (status: IsPublicEnum) => SetMetadata(ISPUBLIC_KEY, status);
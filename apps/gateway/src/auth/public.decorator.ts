import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Mark a route handler as public — JWT guard will skip it. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

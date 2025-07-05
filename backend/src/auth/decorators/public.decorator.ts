import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key to identify public routes
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator to mark an endpoint as public
 * Public endpoints bypass global JWT authentication
 * @returns A metadata decorator
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true); 
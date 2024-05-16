import { SetMetadata } from '@nestjs/common';

export const SkipAdmin = () => SetMetadata('skipAdmin', true);

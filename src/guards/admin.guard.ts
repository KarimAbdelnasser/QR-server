import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';

interface CustomRequest extends Request {
  user?: any;
}

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const req = context.switchToHttp().getRequest<CustomRequest>();
    const user = req.user;

    const isExcluded = this.reflector.get<boolean>(
      'skipAdmin',
      context.getHandler(),
    );

    if (isExcluded) {
      return true;
    }

    if (!user || !user.isAdmin) {
      throw new UnauthorizedException('Unauthorized - Admin access required');
    }

    return true;
  }
}

import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { UsersService } from 'src/users/users.service';

interface CustomRequest extends Request {
  user?: any;
}

@Injectable()
export class IsVerifiedMiddleware implements NestMiddleware {
  constructor(private usersService: UsersService) {}

  async use(req: CustomRequest, res: Response, next: NextFunction) {
    try {
      const user = req.user;

      if (!user) {
        throw new UnauthorizedException('Unauthorized');
      }

      if (!user.isVerified) {
        throw new UnauthorizedException('User not verified');
      }

      next();
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        return res.status(401).send({ message: error.message });
      }
      return res.status(401).send({ message: 'Unauthorized' });
    }
  }
}

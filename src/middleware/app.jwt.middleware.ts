import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { config } from 'src/config/config';
import { UsersService } from 'src/users/users.service';

interface CustomRequest extends Request {
  user?: any;
}

@Injectable()
export class AppJwtMiddleware implements NestMiddleware {
  constructor(private usersService: UsersService) {}
  async use(req: CustomRequest, res: Response, next: NextFunction) {
    try {
      const token = req.headers['auth-token'] as string;
      if (!token) {
        return res.status(401).send({ message: 'Unauthorized' });
      }
      const decodedToken = jwt.verify(token, config.appJwt);

      req.user = decodedToken;

      const userId = req.user._id;

      const user = await this.usersService.findOne(userId);

      if (!user) {
        throw new UnauthorizedException('User not registered');
      }

      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).send({ message: 'Token expired' });
      }
      if (error instanceof UnauthorizedException) {
        return res.status(401).send({ message: error.message });
      }
      return res.status(401).send({ message: 'Invalid token' });
    }
  }
}

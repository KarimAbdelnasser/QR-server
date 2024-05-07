import { Injectable } from '@nestjs/common';
import { QRService } from 'src/qr/qr.service';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AppService {
  constructor(
    private qrService: QRService,
    private usersService: UsersService,
  ) {}
}

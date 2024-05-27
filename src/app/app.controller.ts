import {
    Controller,
    Get,
    Res,
  } from '@nestjs/common';
  
  @Controller()
  export class AppController {
  
    @Get('/health')
    health(@Res() res) {
      res.status(200).json({
        message: 'up and running',
        success: true,
      });
    }
  }
  
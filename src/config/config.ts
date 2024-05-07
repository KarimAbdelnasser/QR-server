import * as dotenv from 'dotenv';
dotenv.config();

export const config = {
  salt: process.env.SALT,
  scanJwt: process.env.SCAN_JWT_SECRET,
  appJwt: process.env.APP_JWT_SECRET,
  mongoUrlDev: process.env.MONGO_URL,
  mongoUrlPro: process.env.MONGO_URL_PRO,
  url: process.env.WEBSITE_URL,
};

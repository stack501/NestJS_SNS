import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

const logDir = 'logs';

export const winstonConfig = {
  transports: [
    // 콘솔 출력
    new winston.transports.Console({
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        nestWinstonModuleUtilities.format.nestLike('SNS_APP', {
          prettyPrint: true,
        }),
      ),
    }),
    
    // 에러 로그 파일
    new winston.transports.DailyRotateFile({
      level: 'error',
      dirname: logDir,
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
    
    // 일반 로그 파일
    new winston.transports.DailyRotateFile({
      level: 'info',
      dirname: logDir,
      filename: 'application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
  ],
};
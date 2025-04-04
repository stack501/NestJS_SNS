import { BadRequestException, Module } from '@nestjs/common';
import { CommonService } from './common.service';
import { CommonController } from './common.controller';
import { MulterModule } from '@nestjs/platform-express';
import { extname } from 'path';
import * as multer from 'multer';
import {v4 as uuid} from 'uuid';
import { existsSync, mkdirSync } from 'fs';
import { TEMP_FOLDER_PATH } from './const/path.const';
import { AuthModule } from 'src/auth/auth.module';
import { UsersModule } from 'src/users/users.module';

// 업로드 경로가 존재하지 않으면 생성 (recursive 옵션으로 상위 폴더까지 생성)
if (!existsSync(TEMP_FOLDER_PATH)) {
  mkdirSync(TEMP_FOLDER_PATH, { recursive: true });
}

@Module({
  imports: [
    MulterModule.register({
      limits: {
        // 바이트 단위로 입력
        fileSize: 1024 * 1024 * 10,
      },
      fileFilter: (req, file, cb) => {
        /**
         * cb(에러, boolean)
         * 
         * 첫 번째 파라미터에는 에러가 있을 경우 에러 정보를 넣어준다.
         * 두 번째 파라미터는 파일을 받을지 말지 boolean을 넣어준다.
         */

        // xxx.jpg -> jpg(확장자)만 가져옴
        const ext = extname(file.originalname);

        if(ext !== '.jpg' && ext !== '.jpeg' && ext !== '.png') {
          return cb(
            new BadRequestException('jpg/jpeg/png 파일만 업로드 가능합니다.'),
            false,
          );
        }

        return cb(null, true);
      },
      storage: multer.diskStorage({
        destination: function(req, res, cb) {
          cb(null, TEMP_FOLDER_PATH);
        },
        filename: function(req, file, cb) {
          cb(null, `${uuid()}${extname(file.originalname)}`)
        }
      }),
    }),
    AuthModule,
    UsersModule,
  ],
  controllers: [CommonController],
  providers: [CommonService],
  exports: [CommonService],
})
export class CommonModule {}

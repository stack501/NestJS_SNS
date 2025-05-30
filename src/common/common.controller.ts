import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { CommonService } from './common.service';
import { FileInterceptor } from '@nestjs/platform-express';

/**
 * 공통 기능을 제공하는 컨트롤러
 * 
 * 이미지 업로드 등의 공통 기능을 처리합니다.
 */
@Controller('common')
export class CommonController {
  constructor(private readonly commonService: CommonService) {}

  /**
   * 이미지를 업로드합니다
   * @param file 업로드된 파일 정보
   * @returns 업로드된 파일명
   */
  @Post('image')
  @UseInterceptors(FileInterceptor('image'))
  postImage(
    @UploadedFile() file: Express.Multer.File,
  ) {
    return {
      fileName: file.filename,
    }
  }
}

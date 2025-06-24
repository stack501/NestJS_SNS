import { Test, TestingModule } from '@nestjs/testing';
import { CommonController } from './common.controller';
import { CommonService } from './common.service';

describe('CommonController', () => {
  let controller: CommonController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommonController],
      providers: [
        {
          provide: CommonService,
          useValue: {
            // CommonService에서 사용하는 메서드들을 mock으로 제공
            uploadImage: jest.fn(),
            // 필요한 다른 메서드들도 추가
          },
        },
      ],
    }).compile();

    controller = module.get<CommonController>(CommonController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('postImage', () => {
    it('should return fileName when file is uploaded', () => {
      const mockFile = {
        fieldname: 'image',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024,
        filename: 'test-123.jpg',
        path: '/uploads/test-123.jpg',
        buffer: Buffer.from('test'),
        destination: '/uploads',
      } as Express.Multer.File;

      const result = controller.postImage(mockFile);

      expect(result).toEqual({
        fileName: 'test-123.jpg',
      });
    });

    it('should handle file upload correctly', () => {
      const mockFile = {
        fieldname: 'image',
        originalname: 'another-test.png',
        encoding: '7bit',
        mimetype: 'image/png',
        size: 2048,
        filename: 'another-test-456.png',
        path: '/uploads/another-test-456.png',
        buffer: Buffer.from('test-data'),
        destination: '/uploads',
      } as Express.Multer.File;

      const result = controller.postImage(mockFile);

      expect(result).toBeDefined();
      expect(result.fileName).toBe('another-test-456.png');
    });
  });
});

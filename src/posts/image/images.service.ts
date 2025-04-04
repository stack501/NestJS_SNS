import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ImageModel } from "src/common/entity/image.entity";
import { QueryRunner, Repository } from "typeorm";
import { POST_IMAGE_PATH, TEMP_FOLDER_PATH } from 'src/common/const/path.const';
import { basename, join } from 'path';
import { promises } from 'fs';
import { CreatePostImageDto } from "./dto/create-image.dto";

@Injectable()
export class PostsImagesService {
    constructor(
        @InjectRepository(ImageModel)
        private readonly imageRepository: Repository<ImageModel>
    ) {}

    getRepository(qr?: QueryRunner) {
        return qr ? qr.manager.getRepository<ImageModel>(ImageModel) : this.imageRepository;
    }

    async createPostImage(dto: CreatePostImageDto, qr?: QueryRunner) {
        const repository = this.getRepository(qr);

        // dto의 이미지 이름을 기반으로 파일의 경로를 생성한다.
        const tempFilePath = join(
            TEMP_FOLDER_PATH,
            dto.path,
        );

        try {
            // 파일이 존재하는지 확인. 파일이 없는 경우 에러발생.
            await promises.access(tempFilePath);
        } catch (error) {
            throw new BadRequestException(`${error}: 존재하지 않는 파일입니다.`);
        }

        // 파일 이름만 가져오기
        const fileName = basename(tempFilePath);

        // 새로 이동할 포스트 폴더 이름 + 이미지 이름
        const newPath = join(
            POST_IMAGE_PATH,
            fileName,
        );

        // save -> 파일 옮기기전에 하는 이유는 rollback 시 파일 옮기기가 실행되지 않기 때문
        const result = repository.save({
            ...dto,
        });

        // 파일 옮기기
        await promises.rename(tempFilePath, newPath);

        return result;
    }
}
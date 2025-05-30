import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { DataSource } from 'typeorm';
import { PostsModel } from '../../posts/entity/posts.entity';

/**
 * 포스트 데이터 시더
 * 개발 및 테스트를 위한 대량의 포스트 데이터를 생성
 */
export default class CreatePostsSeeder implements Seeder {
  /**
   * 시드 데이터 생성 실행
   * 총 500,000개의 포스트를 5,000개씩 청크 단위로 생성하여 메모리 사용량 최적화
   * 
   * @param dataSource TypeORM 데이터 소스
   * @param factoryManager 팩토리 매니저
   */
  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager
  ): Promise<void> {
    // // PostsModel 팩토리를 가져와서 500,000개 생성,저장
    // const postFactory = factoryManager.get(PostsModel);
    // await postFactory.saveMany(500_000);

    const postFactory = factoryManager.get(PostsModel);
    const total = 500_000;      // 총 생성할 포스트 수
    const chunkSize = 5_000;    // 한 번에 처리할 청크 크기

    // 청크 단위로 포스트 생성하여 메모리 효율성 확보
    for (let i = 0; i < total; i += chunkSize) {
      await postFactory.saveMany(chunkSize);
      console.log(`Seeded ${i + chunkSize} / ${total}`);
    }
  }
}
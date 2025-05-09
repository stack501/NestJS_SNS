import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { DataSource } from 'typeorm';
import { PostsModel } from '../../posts/entity/posts.entity';

export default class CreatePostsSeeder implements Seeder {
  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager
  ): Promise<void> {
    // // PostsModel 팩토리를 가져와서 500,000개 생성,저장
    // const postFactory = factoryManager.get(PostsModel);
    // await postFactory.saveMany(500_000);

    const postFactory = factoryManager.get(PostsModel);
    const total = 500_000;
    const chunkSize = 5_000;

    for (let i = 0; i < total; i += chunkSize) {
      await postFactory.saveMany(chunkSize);
      console.log(`Seeded ${i + chunkSize} / ${total}`);
    }
  }
}
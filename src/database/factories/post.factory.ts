import { setSeederFactory } from 'typeorm-extension';
import { PostsModel } from '../../posts/entity/posts.entity';
import { faker } from '@faker-js/faker/locale/en';
import { UsersModel } from 'src/users/entity/users.entity';

export default setSeederFactory(PostsModel, () => {
  const post = new PostsModel();
  post.title   = faker.lorem.sentence();
  post.content = faker.lorem.paragraphs(3);
  post.author = { id: 3 } as UsersModel;

  return post;
});
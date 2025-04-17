export const REDIS_KEYS_MAPPER = {
    followingPosts: (userId: number) => `following-posts/${userId}`,
}
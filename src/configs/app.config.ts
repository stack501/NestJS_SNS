import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
    jwt: {
        secretKey: process.env.JWT_SECRET,
    },
    encrypt: {
        hash_Rounds: process.env.HASH_ROUNDS,
    },
    http: {
        protocol: process.env.PROTOCOL,
        host: process.env.HOST,
    },
    swagger: {
        user: process.env.SWAGGER_USER,
        password: process.env.SWAGGER_PASSWORD,
    },
}));
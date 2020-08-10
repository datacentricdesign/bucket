import 'dotenv/config';

export const httpConfig: any = {
    host: process.env.HTTP_HOST,
    port: process.env.HTTP_PORT,
    secured: process.env.HTTP_SECURED === 'true',
    baseUrl: process.env.HTTP_BASE_URL,
    url: (process.env.HTTP_SECURED === 'true' ? 'https':'http') + '://' + process.env.HTTP_HOST + ':' +process.env.HTTP_PORT
};
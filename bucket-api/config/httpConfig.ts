
export const httpConfig: any = {
    host: process.env.HTTP_HOST,
    port: process.env.HTTP_PORT,
    secured: process.env.HTTP_SECURED,
    url: (process.env.HTTP_SECURED ? 'https':'http') + '://' + process.env.HTTP_HOST + ':' +process.env.HTTP_PORT
};
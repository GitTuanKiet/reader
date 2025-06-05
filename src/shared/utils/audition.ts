import { Context } from 'koa';

export const getAuditionMiddleware = () => {
    return async (ctx: Context, next: () => Promise<void>) => {
        await next();
    };
};
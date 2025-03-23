import type { Request, Response } from 'express';
import type { Context } from 'koa';
import { URL } from 'url';

export function createKoaContextMock(req: Request, res: Response): Context {
    // Parse the full URL from request
    const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const parsedUrl = new URL(fullUrl);

    // Create a mock Koa context with properties used by CrawlerHost
    const mockCtx = {
        method: req.method,
        URL: parsedUrl,
        hostname: req.hostname,
        ip: req.ip,
        path: req.path,
        headers: req.headers,
        accepts: function (type: string | string[]): string | string[] | false {
            const acceptHeader = req.get('Accept') || '';
            if (Array.isArray(type)) {
                for (const t of type) {
                    if (acceptHeader.includes(t)) return t;
                }
                return false;
            }
            return acceptHeader.includes(type) ? type : false;
        },
        get: function (header: string): string {
            return req.get(header) || '';
        },
        req,
        res
    } as unknown as Context;

    return mockCtx;
}
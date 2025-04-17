import 'reflect-metadata';
import express, { Request, Response } from 'express';
import { container, singleton } from 'tsyringe';
import path from 'path';
import fs from 'fs';
import { assignTransferProtocolMeta, HashManager, RPC_CALL_ENVIRONMENT, RPCReflection } from 'civkit';
import { OutputServerEventStream } from '../shared';
import { JinaEmbeddingsAuthDTO } from '../dto/jina-embeddings-auth';
import { CrawlerOptions, CrawlerOptionsHeaderOnly } from '../dto/crawler-options';
import { AdaptiveCrawlerHost } from '../cloud-functions/adaptive-crawler';
import { AdaptiveCrawlerOptions } from '../dto/adaptive-crawler-options';
import { AdaptiveCrawlTask, AdaptiveCrawlTaskStatus } from '../db/adaptive-crawl-task';
import { Timestamp } from 'firebase-admin/firestore';
import { createKoaContextMock } from './_helpers';

const md5Hasher = new HashManager('md5', 'hex');
const removeURLHash = (url: string) => {
    try {
        const o = new URL(url);
        o.hash = '';
        return o.toString();
    } catch (e) {
        return url;
    }
};


const BASE_URL = process.env.BASE_URL as string;
if (!BASE_URL) {
    throw new Error('BASE_URL is not set');
}

@singleton()
export class LocalAdaptiveCrawlerHost extends AdaptiveCrawlerHost {
    override async adaptiveCrawl(
        rpcReflect: RPCReflection,
        ctx: {
            req: Request,
            res: Response,
        },
        auth: JinaEmbeddingsAuthDTO,
        crawlerOptions: CrawlerOptions,
        adaptiveCrawlerOptions: AdaptiveCrawlerOptions,
    ) {
        this.logger.debug({
            adaptiveCrawlerOptions,
            crawlerOptions,
        });


        const uid = await auth.solveUID();
        const { useSitemap, maxPages } = adaptiveCrawlerOptions;

        let tmpUrl = ctx.req.url.slice(1)?.trim();
        if (!tmpUrl) {
            tmpUrl = crawlerOptions.url?.trim() ?? '';
        }
        const targetUrl = new URL(tmpUrl);

        if (!targetUrl) {
            const latestUser = uid ? await auth.assertUser() : undefined;
            if (!ctx.req.accepts('text/plain') && (ctx.req.accepts('text/json') || ctx.req.accepts('application/json'))) {
                return this.getIndex(latestUser);
            }

            return assignTransferProtocolMeta(`${this.getIndex(latestUser)}`,
                { contentType: 'text/plain', envelope: null }
            );
        }

        const meta = {
            targetUrl: targetUrl.toString(),
            useSitemap,
            maxPages,
        };

        const digest = md5Hasher.hash(JSON.stringify(meta));
        const shortDigest = Buffer.from(digest, 'hex').toString('base64url');
        const existing = await AdaptiveCrawlTask.fromFirestore(shortDigest);

        if (existing?.createdAt) {
            if (existing.createdAt.getTime() > Date.now() - this.cacheExpiry) {
                this.logger.info(`Cache hit for ${shortDigest}, created at ${existing.createdAt.toDateString()}`);
                return { taskId: shortDigest };
            } else {
                this.logger.info(`Cache expired for ${shortDigest}, created at ${existing.createdAt.toDateString()}`);
            }
        }

        await AdaptiveCrawlTask.COLLECTION.doc(shortDigest).set({
            _id: shortDigest,
            status: AdaptiveCrawlTaskStatus.PENDING,
            statusText: 'Pending',
            meta,
            createdAt: new Date(),
            urls: [],
            processed: {},
            failed: {},
        });

        let urls: string[] = [];
        if (useSitemap) {
            urls = await this.crawlUrlsFromSitemap(targetUrl, maxPages);
        }

        if (urls.length > 0) {
            await AdaptiveCrawlTask.COLLECTION.doc(shortDigest).update({
                status: AdaptiveCrawlTaskStatus.PROCESSING,
                statusText: `Processing 0/${urls.length}`,
                urls,
            });

            const batchSize = 3;
            setImmediate(async () => {
                for (let i = 0; i < urls.length; i += batchSize) {
                    const batch = urls.slice(i, i + batchSize);
                    await Promise.all(
                        batch.map(url =>
                            this.singleCrawlQueue(shortDigest, url, auth.bearerToken || '', meta)
                        )
                    ).catch((err) => this.logger.error('Error in batch crawl', err));
                }
            });
        } else {
            meta.useSitemap = false;
            await AdaptiveCrawlTask.COLLECTION.doc(shortDigest).update({
                urls: [targetUrl.toString()],
            });
            setImmediate(() => {
                this.singleCrawlQueue(shortDigest, targetUrl.toString(), auth.bearerToken || '', meta)
                    .catch((err) => this.logger.error('Error in single crawl', err));
            });
        }

        return { taskId: shortDigest };
    }

    override async handleSingleCrawl(shortDigest: string, url: string, token: string, cachePath: string) {
        const error = { reason: '' };

        const response = await fetch(`${BASE_URL}/${url}`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            error.reason = `Failed to crawl ${url}, ${response.statusText}`;
        } else {
            const json = await response.json();
            await this.firebaseObjectStorage.saveFile(
                cachePath,
                Buffer.from(JSON.stringify(json), 'utf-8'),
                { metadata: { contentType: 'application/json' } }
            );
        }

        return { error };
    }

    override async handleSingleCrawlRecursively(
        shortDigest: string, url: string, token: string, meta: AdaptiveCrawlTask['meta'], cachePath: string
    ) {
        const error = { reason: '' };
        const response = await fetch(`${BASE_URL}/${url}`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'X-With-Links-Summary': 'true',
            },
        });

        if (!response.ok) {
            error.reason = `Failed to crawl ${url}, ${response.statusText}`;
        } else {
            const json = await response.json();
            await this.firebaseObjectStorage.saveFile(
                cachePath,
                Buffer.from(JSON.stringify(json), 'utf-8'),
                { metadata: { contentType: 'application/json' } }
            );

            const { title, description, links } = json.data;
            const relevantUrls = await this.getRelevantUrls(token, { title, description, links });
            this.logger.debug(`Total urls: ${Object.keys(links).length}, relevant urls: ${relevantUrls.length}`);

            for (const url of relevantUrls) {
                let abortContinue = false;
                let abortBreak = false;

                await AdaptiveCrawlTask.DB.runTransaction(async (transaction) => {
                    const ref = AdaptiveCrawlTask.COLLECTION.doc(shortDigest);
                    const state = await transaction.get(ref);
                    const data = state.data() as AdaptiveCrawlTask & { createdAt: Timestamp; };

                    if (data.urls.includes(url)) {
                        this.logger.debug('Recursive CONTINUE', data);
                        abortContinue = true;
                        return;
                    }

                    const urls = [...data.urls, url];

                    if (urls.length > meta.maxPages || data.status === AdaptiveCrawlTaskStatus.COMPLETED) {
                        this.logger.debug('Recursive BREAK', data);
                        abortBreak = true;
                        return;
                    }

                    transaction.update(ref, { urls });
                });

                if (abortContinue) continue;
                if (abortBreak) break;

                await this.singleCrawlQueue(shortDigest, url, token, meta);
            }
        }

        return { error };
    }

    override async getRelevantUrls(token: string, {
        title, description, links
    }: {
        title: string;
        description: string;
        links: Record<string, string>;
    }) {
        const invalidSuffix = [
            '.zip',
            '.docx',
            '.pptx',
            '.xlsx',
        ];

        const validLinks = Object.entries(links)
            .map(([title, link]) => link)
            .filter(link => link.startsWith('http') && !invalidSuffix.some(suffix => link.endsWith(suffix)));

        let query = '';
        if (!description) {
            query += title;
        } else {
            query += `TITLE: ${title}; DESCRIPTION: ${description}`;
        }

        // const data = {
        //     model: 'rerank-multilingual-v3.0',
        //     query,
        //     top_n: 15,
        //     documents: validLinks,
        // };

        // const cohereToken = process.env.COHERE_API_KEY;
        // if (!cohereToken) {
        //     throw new Error('COHERE_API_KEY is not set');
        // }

        // const response = await fetch('https://api.cohere.com/v2/rerank', {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json',
        //         'Authorization': `Bearer ${cohereToken}`
        //     },
        //     body: JSON.stringify(data)
        // });

        // const json = (await response.json()) as {
        //     results: {
        //         index: number;
        //         // document: {
        //         //     text: string;
        //         // };
        //         relevance_score: number;
        //     }[];
        // };

        // if ('results' in json === false) {
        //     console.error('Cohere API error:', json);
        //     // Limit exceeded
        //     return validLinks.map(removeURLHash);
        // }

        // const highestRelevanceScore = json.results[0]?.relevance_score ?? 0;
        // return json.results.filter(r => r.relevance_score > Math.max(highestRelevanceScore * 0.6, 0.1)).map(r => removeURLHash(validLinks[r.index]));

        const batchSize = 32;
        const relevantUrls: Set<string> = new Set();
        let highestRelevanceScore = 0;

        // for (let i = 0; i < validLinks.length; i += batchSize) {
        //     const batch = validLinks.slice(i, i + batchSize);
        //     const data = {
        //         query,
        //         texts: batch,
        //         return_text: true,
        //         truncate: true
        //     };

        //     const response = await fetch('http://reranker/rerank', {
        //         method: 'POST',
        //         headers: {
        //             'Content-Type': 'application/json',
        //         },
        //         body: JSON.stringify(data)
        //     });

        //     const json = (await response.json()) as {
        //         index: number;
        //         score: number;
        //         text: string;
        //     }[];

        //     highestRelevanceScore = Math.max(highestRelevanceScore, json[0]?.score ?? 0);
        //     json.filter(r => r.score > Math.max(highestRelevanceScore * 0.6, 0.1)).map(r => relevantUrls.add(removeURLHash(r.text)));
        // }

        // return Array.from(relevantUrls).slice(0, 15);

        const promises = [];
        for (let i = 0; i < validLinks.length; i += batchSize) {
            const batch = validLinks.slice(i, i + batchSize);
            const data = {
                query,
                texts: batch,
                return_text: true,
                truncate: true
            };

            promises.push(
                fetch('http://reranker/rerank', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                })
            );
        }

        const responses = await Promise.all(promises);
        const jsons = await Promise.all(responses.map(r => r.json())) as {
            index: number;
            score: number;
            text: string;
        }[][];
        for (const json of jsons) {
            const highestScore = json[0]?.score ?? 0;
            highestRelevanceScore = Math.max(highestRelevanceScore, highestScore);
            json.filter(r => r.score > Math.max(highestRelevanceScore * 0.6, 0.1)).map(r => relevantUrls.add(removeURLHash(r.text)));
        }
        return Array.from(relevantUrls).slice(0, 15);
    }
}

const app = express();
const port = process.env.PORT || 3002;

const adaptiveCrawlerHost = container.resolve(LocalAdaptiveCrawlerHost);
(async () => {
    await adaptiveCrawlerHost.init();
})();

app.use(express.json());
app.use('/instant-screenshots', express.static(path.resolve('.firebase', 'instant-screenshots')));

app.all('*', async (req, res) => {
    const brearerToken = req.headers.authorization?.split(' ')[1];
    if (process.env.AUTH_TOKEN && brearerToken !== process.env.AUTH_TOKEN) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const rpcReflection = {
            name: 'adaptive-crawl',
            finally: () => {
                console.log('Mock: Finally called');
            },
            return: (stream: OutputServerEventStream) => {
                console.log('Mock: Stream returned');
            }
        } as unknown as RPCReflection;

        const ctx = createKoaContextMock(req, res);
        const auth = JinaEmbeddingsAuthDTO.from({
            _id: 'admin',
            uid: 'admin',
            user_id: 'admin',
            full_name: 'admin',
            wallet: { total_balance: 1_000_000_000 },
            metadata: {},
            _token: brearerToken,
            [RPC_CALL_ENVIRONMENT]: ctx
        });
        const input = { ...req.body, [RPC_CALL_ENVIRONMENT]: ctx };

        let crawlerOptions: CrawlerOptions | CrawlerOptionsHeaderOnly;
        if (req.method === 'GET') {
            crawlerOptions = CrawlerOptionsHeaderOnly.from(input);
        } else if (req.method === 'POST') {
            if ('taskId' in input) {
                const taskId = input.taskId;
                const urls = input.urls;

                const result = await adaptiveCrawlerHost.adaptiveCrawlStatus(rpcReflection, { req, res }, auth, taskId, urls);
                return res
                    .status(200)
                    .json({
                        code: 200,
                        status: 20000,
                        data: result
                    });
            }
            crawlerOptions = CrawlerOptions.from(input);
        } else {
            return res.status(405).json({ error: 'Method not allowed' });
        }
        const adaptiveCrawlerOptions = AdaptiveCrawlerOptions.from(input);

        const noSlashURL = req.url.slice(1);
        if (noSlashURL.startsWith('instant-screenshots/')) {
            const screenshotPath = path.resolve('.firebase', noSlashURL);
            if (fs.existsSync(screenshotPath)) {
                return res.sendFile(screenshotPath);
            } else {
                return res.status(404).type('text/plain').send('Screenshot not found');
            }
        }

        if (noSlashURL === 'favicon.ico') {
            return res.status(404).type('text/plain').send('No favicon');
        }

        const result = await adaptiveCrawlerHost.adaptiveCrawl(
            rpcReflection,
            { req, res },
            auth,
            crawlerOptions,
            adaptiveCrawlerOptions
        );

        return res
            .status(200)
            .json({
                code: 200,
                status: 20000,
                data: result
            });
    } catch (error) {
        console.error('Error during crawl:', error);
        if (error instanceof Error) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ error: 'An error occurred during the crawl' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

// process.on('unhandledRejection', (_err) => `Somehow is false alarm in firebase`);

// process.on('uncaughtException', (err) => {
//     console.log('Uncaught exception', err);

//     // Looks like Firebase runtime does not handle error properly.
//     // Make sure to quit the process.
//     process.nextTick(() => process.exit(1));
//     console.error('Uncaught exception, process quit.');
//     throw err;
// });

export default app;
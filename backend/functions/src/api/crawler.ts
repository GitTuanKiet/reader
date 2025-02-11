import 'reflect-metadata';
import express from 'express';
import { container } from 'tsyringe';
import path from 'path';
import fs from 'fs';
import { RPC_MARSHAL, RPC_CALL_ENVIRONMENT, RPCReflection, extractTransferProtocolMeta } from 'civkit';
import { OutputServerEventStream } from '../shared';
import { JinaEmbeddingsAuthDTO } from '../shared/dto/jina-embeddings-auth';
import { CrawlerOptions, CrawlerOptionsHeaderOnly } from '../dto/scrapping-options';
import { CrawlerHost } from '../cloud-functions/crawler';

const app = express();
const port = process.env.PORT || 3000;

const crawlerHost = container.resolve(CrawlerHost);
(async () => {
    await crawlerHost.init();
})();

app.use(express.json());

// Serve static files from the local-storage directory
app.use('/instant-screenshots', express.static(path.resolve('.firebase', 'instant-screenshots')));

app.all('*', async (req, res) => {
    const brearerToken = req.headers.authorization?.split(' ')[1];
    if (process.env.AUTH_TOKEN && brearerToken !== process.env.AUTH_TOKEN) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const rpcReflection = {
            name: 'crawl',
            finally: () => {
                console.log('Mock: Finally called');
            },
            return: (stream: OutputServerEventStream) => {
                console.log('Mock: Stream returned');
            }
        } as unknown as RPCReflection;
        const auth = new JinaEmbeddingsAuthDTO();
        const ctx = { req, res };
        let options;
        const input = { ...req.body, [RPC_CALL_ENVIRONMENT]: ctx };
        if (req.method === 'GET') {
            options = CrawlerOptionsHeaderOnly.from(input);
        } else if (req.method === 'POST') {
            options = CrawlerOptions.from(input);
        } else {
            return res.status(405).json({ error: 'Method not allowed' });
        }

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

        const result = await crawlerHost.crawl(rpcReflection, ctx, auth, options, options);

        const meta = extractTransferProtocolMeta(result);
        if (meta) {
            if (meta.code)
                res.status(meta.code);

            if (meta.contentType) {
                res.type(meta.contentType);
            }

            if (meta.headers) {
                for (const [key, value] of Object.entries(meta.headers)) {
                    if (value !== undefined && value !== null) {
                        res.setHeader(key, value as string | number | readonly string[]);
                    }
                }
            }
        }

        if (
            ('toJSON' in result && typeof result.toJSON === 'function') ||
            (result[RPC_MARSHAL] && typeof result[RPC_MARSHAL] === 'function')
        ) {
            const resultJSON = result.toJSON ? result.toJSON() : result[RPC_MARSHAL]();

            return res.send(resultJSON);
        }

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

process.on('unhandledRejection', (_err) => `Somehow is false alarm in firebase`);

process.on('uncaughtException', (err) => {
    console.log('Uncaught exception', err);

    // Looks like Firebase runtime does not handle error properly.
    // Make sure to quit the process.
    process.nextTick(() => process.exit(1));
    console.error('Uncaught exception, process quit.');
    throw err;
});

export default app;

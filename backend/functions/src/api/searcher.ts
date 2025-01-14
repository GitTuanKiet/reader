import 'reflect-metadata';
import express from 'express';
import { container } from 'tsyringe';
import path from 'path';
import fs from 'fs';
import { RPC_MARSHAL, RPC_TRANSFER_PROTOCOL_META_SYMBOL, RPC_CALL_ENVIRONMENT, RPCReflection } from 'civkit';

import { OutputServerEventStream } from '../shared';
import { JinaEmbeddingsAuthDTO } from '../shared/dto/jina-embeddings-auth';
import { CrawlerOptions, CrawlerOptionsHeaderOnly } from '../dto/scrapping-options';
import { BraveSearchExplicitOperatorsDto } from '../services/brave-search';
import { SearcherHost } from '../cloud-functions/searcher';

const app = express();
const port = process.env.PORT || 3000;

const searcherHost = container.resolve(SearcherHost);
(async () => {
    await searcherHost.init();
    const { JSDomControl } = require('../services/jsdom');
    await (container.resolve(JSDomControl) as typeof JSDomControl).init();
})();

app.use(express.json());

// Serve static files from the local-storage directory
app.use('/instant-screenshots', express.static(path.resolve('.firebase', 'instant-screenshots')));

app.all('*', async (req, res) => {
    try {
        const ctx = { req, res };
        let options;
        if (req.method === 'GET') {
            options = CrawlerOptionsHeaderOnly.from({ [RPC_CALL_ENVIRONMENT]: ctx });
        } else if (req.method === 'POST') {
            options = CrawlerOptions.from({ [RPC_CALL_ENVIRONMENT]: ctx });
        } else {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        const noSlashPath = req.url.slice(1);
        if (noSlashPath
            .startsWith('instant-screenshots/')) {
            const screenshotPath = path.resolve('.firebase', noSlashPath
            );
            if (fs.existsSync(screenshotPath)) {
                return res.sendFile(screenshotPath);
            } else {
                return res.status(404).type('text/plain').send('Screenshot not found');
            }
        }

        if (noSlashPath
            === 'favicon.ico') {
            return res.status(404).type('text/plain').send('No favicon');
        }

        const rpcReflection = {
            name: 'search',
            finally: () => {
                console.log('Mock: Finally called');
            },
            return: (stream: OutputServerEventStream) => {
                console.log('Mock: Stream returned');
            }
        } as unknown as RPCReflection;
        const auth = new JinaEmbeddingsAuthDTO();

        const result = await searcherHost.search(
            rpcReflection,
            ctx,
            auth,
            5,
            options,
            BraveSearchExplicitOperatorsDto.from({ [RPC_CALL_ENVIRONMENT]: ctx }),
            noSlashPath

        ) as any;

        const meta = result[RPC_TRANSFER_PROTOCOL_META_SYMBOL];

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

        if ('toJSON' in result && typeof result.toJSON === 'function') {
            return res.send(result.toJSON());
        }

        if (result[RPC_MARSHAL] && typeof result[RPC_MARSHAL] === 'function') {
            return res.send(result[RPC_MARSHAL]());
        }

        return res.send(result);
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

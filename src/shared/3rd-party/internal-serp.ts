import { WebSearchEntry } from '../../services/serp/compat';
import { SerperBingHTTP, SerperSearchQueryParams } from './serper-search';

export class JinaSerpApiHTTP {
    private serperBingHTTP: SerperBingHTTP;
    constructor(apiKey: string) {
        this.serperBingHTTP = new SerperBingHTTP(apiKey);
    }

    async webSearch(query: SerperSearchQueryParams, options?: { headers: Record<string, string>; }): Promise<{
        parsed: {
            results: (Omit<WebSearchEntry, 'link'> & { url?: string; })[];
        };
    }> {
        const { parsed } = await this.serperBingHTTP.webSearch(query, options);

        return {
            parsed: {
                results: parsed.organic,
            }
        };
    }
}
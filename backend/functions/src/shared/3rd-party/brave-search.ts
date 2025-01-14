import { singleton } from 'tsyringe';
import type { WebSearchApiResponse } from "./brave-types";

const BRAVE_SEARCH_API_ENDPOINT = 'https://api.search.brave.com/res/v1/web/search';
const SERPER_API_ENDPOINT = 'https://google.serper.dev/search';

export interface WebSearchQueryParams {
    q: string;
    count?: number;
    offset?: number;
}

@singleton()
export class BraveSearchHTTP {
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async webSearch(query: WebSearchQueryParams, options: { headers: Record<string, string>; }) {
        const useBraveSearch = process.env.USE_BRAVE_SEARCH === '1';
        return useBraveSearch
            ? this.braveSearch(query, options)
            : this.serperSearch(query, options);
    }

    private async braveSearch(query: WebSearchQueryParams, options: { headers: Record<string, string>; }) {
        const params = new URLSearchParams();

        // Add query parameters
        if (query.q) params.append('q', query.q);
        if (query.offset) params.append('offset', String(query.offset + 1));
        if (query.count) params.append('count', String(query.count));

        const response = await fetch(`${BRAVE_SEARCH_API_ENDPOINT}?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Accept-Encoding': 'gzip',
                'X-Subscription-Token': this.apiKey,
                ...options.headers
            }
        });

        if (!response.ok) {
            const error = new Error(`Brave Search API error: ${response.statusText}`);
            (error as any).status = response.status;
            throw error;
        }
        const data = await response.json() as WebSearchApiResponse;
        const parsed = {
            web: {
                results: data?.web?.results.map((r: { url: string; title?: string; description?: string; }) => ({
                    url: r.url,
                    title: r.title,
                    description: r.description,
                })),
            },
        };

        return { parsed };
    }

    private async serperSearch(query: WebSearchQueryParams, options: { headers: Record<string, string>; }) {
        const response = await fetch(SERPER_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': this.apiKey,
                ...options.headers
            },
            body: JSON.stringify({
                q: query.q,
                page: query.offset ? query.offset + 1 : 1,
                num: query.count
            })
        });

        if (!response.ok) {
            const error = new Error(`Serper API error: ${response.statusText}`);
            (error as any).status = response.status;
            throw error;
        }

        const data = await response.json();
        const parsed = {
            web: {
                results: data?.organic.map((r: { link: string; title?: string; snippet?: string; }) => ({
                    url: r.link,
                    title: r.title,
                    description: r.snippet,
                })),
            },
        };

        return { parsed };
    }
}

import { singleton } from 'tsyringe';

export interface WebSearchQueryParams {
    q: string;
    page?: number;
    count?: number;
}

@singleton()
export class BraveSearchHTTP {
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async webSearch(query: WebSearchQueryParams, options: { headers: Record<string, string>; }): Promise<{
        parsed: { web: { title: string; url: string; }[]; };
    }> {
        console.log('API Key:', this.apiKey);
        console.log('BraveSearchAPI Request:', query);
        console.log('Headers:', options.headers);

        throw new Error('Not implemented');
    }
}

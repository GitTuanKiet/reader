import { singleton } from 'tsyringe';

export interface SerperSearchQueryParams {
    q: string;
    num?: number;
    gl?: string;
    hl?: string;
    location?: string;
    page?: number;
}

export interface SerperWebSearchResponse extends SerperSearchResponse {

}

export interface SerperImageSearchResponse {
    images: {
        title: string;
        link: string;
        imageUrl: string;
        source: string;
        imageWidth?: number;
        imageHeight?: number;
    }[];

    pagination?: {
        currentPage: number;
        nextPage?: number;
    };
}

export interface SerperNewsSearchResponse {
    news: {
        title: string;
        link: string;
        snippet: string;
        source: string;
        date?: string;
        position?: number;
    }[];

    pagination?: {
        currentPage: number;
        nextPage?: number;
    };
}

export interface SerperSearchResponse {
    organic: {
        link: string;
        title: string;
        snippet: string;
        position?: number;
    }[];

    knowledgeGraph?: {
        title?: string;
        type?: string;
        description?: string;
        attributes?: Record<string, string>;
    };

    answerBox?: {
        title?: string;
        answer?: string;
        snippet?: string;
    };

    relatedSearches?: string[];

    pagination?: {
        currentPage: number;
        nextPage?: number;
    };
}

const SERPER_API_ENDPOINT = 'https://google.serper.dev/search';
const SERPER_IMAGE_API_ENDPOINT = 'https://google.serper.dev/images';
const SERPER_NEWS_API_ENDPOINT = 'https://google.serper.dev/news';
const SERPER_BING_API_ENDPOINT = 'https://bing.serper.dev/search';
const SERPER_BING_IMAGE_API_ENDPOINT = 'https://bing.serper.dev/images';
const SERPER_BING_NEWS_API_ENDPOINT = 'https://bing.serper.dev/news';

@singleton()
export class SerperGoogleHTTP {
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async webSearch(query: SerperSearchQueryParams, options: { headers: Record<string, string>; } = { headers: {} }): Promise<{ parsed: SerperWebSearchResponse; }> {
        const response = await fetch(SERPER_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': this.apiKey,
                ...options.headers
            },
            body: JSON.stringify({
                q: query.q,
                page: query.page || 1,
                num: query.num || 10,
                gl: query.gl,
                hl: query.hl,
                location: query.location
            })
        });

        if (!response.ok) {
            const error = new Error(`Serper API error: ${response.statusText}`);
            (error as any).status = response.status;
            throw error;
        }

        const data = await response.json() as SerperSearchResponse;

        const parsed = {
            web: {
                results: data?.organic?.map(r => ({
                    url: r.link,
                    title: r.title,
                    description: r.snippet,
                    position: r.position
                })) || [],
            },
            organic: data.organic,
            knowledgeGraph: data.knowledgeGraph,
            answerBox: data.answerBox,
            relatedSearches: data.relatedSearches,
            pagination: data.pagination
        };

        return { parsed };
    }

    async imageSearch(query: SerperSearchQueryParams, options: { headers: Record<string, string>; } = { headers: {} }): Promise<{ parsed: SerperImageSearchResponse; }> {
        const response = await fetch(SERPER_IMAGE_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': this.apiKey,
                ...options.headers
            },
            body: JSON.stringify({
                q: query.q,
                page: query.page || 1,
                num: query.num || 10,
                gl: query.gl,
                hl: query.hl,
                location: query.location
            })
        });

        if (!response.ok) {
            const error = new Error(`Serper API error: ${response.statusText}`);
            (error as any).status = response.status;
            throw error;
        }

        const data = await response.json() as SerperImageSearchResponse;

        return { parsed: data };
    }

    async newsSearch(query: SerperSearchQueryParams, options: { headers: Record<string, string>; } = { headers: {} }): Promise<{ parsed: SerperNewsSearchResponse; }> {
        const response = await fetch(SERPER_NEWS_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': this.apiKey,
                ...options.headers
            },
            body: JSON.stringify({
                q: query.q,
                page: query.page || 1,
                num: query.num || 10,
                gl: query.gl,
                hl: query.hl,
                location: query.location
            })
        });

        if (!response.ok) {
            const error = new Error(`Serper API error: ${response.statusText}`);
            (error as any).status = response.status;
            throw error;
        }

        const data = await response.json() as SerperNewsSearchResponse;

        return { parsed: data };
    }
}

@singleton()
export class SerperBingHTTP {
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async webSearch(query: SerperSearchQueryParams, options: { headers: Record<string, string>; } = { headers: {} }): Promise<{ parsed: SerperWebSearchResponse; }> {
        const response = await fetch(SERPER_BING_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': this.apiKey,
                ...options.headers
            },
            body: JSON.stringify({
                q: query.q,
                page: query.page || 1,
                num: query.num || 10,
                gl: query.gl,
                hl: query.hl,
                location: query.location
            })
        });

        if (!response.ok) {
            const error = new Error(`Serper Bing API error: ${response.statusText}`);
            (error as any).status = response.status;
            throw error;
        }

        const data = await response.json() as SerperWebSearchResponse;

        // Ensure consistent format between Google and Bing results
        const parsed = {
            web: {
                results: data?.organic?.map(r => ({
                    url: r.link,
                    title: r.title,
                    description: r.snippet,
                    position: r.position
                })) || [],
            },
            organic: data.organic,
            knowledgeGraph: data.knowledgeGraph,
            answerBox: data.answerBox,
            relatedSearches: data.relatedSearches,
            pagination: data.pagination
        };

        return { parsed };
    }

    async imageSearch(query: SerperSearchQueryParams, options: { headers: Record<string, string>; } = { headers: {} }): Promise<{ parsed: SerperImageSearchResponse; }> {
        const response = await fetch(SERPER_BING_IMAGE_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': this.apiKey,
                ...options.headers
            },
            body: JSON.stringify({
                q: query.q,
                page: query.page || 1,
                num: query.num || 10,
                gl: query.gl,
                hl: query.hl,
                location: query.location
            })
        });

        if (!response.ok) {
            const error = new Error(`Serper Bing API error: ${response.statusText}`);
            (error as any).status = response.status;
            throw error;
        }

        const data = await response.json() as SerperImageSearchResponse;

        return { parsed: data };
    }

    async newsSearch(query: SerperSearchQueryParams, options: { headers: Record<string, string>; } = { headers: {} }): Promise<{ parsed: SerperNewsSearchResponse; }> {
        const response = await fetch(SERPER_BING_NEWS_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': this.apiKey,
                ...options.headers
            },
            body: JSON.stringify({
                q: query.q,
                page: query.page || 1,
                num: query.num || 10,
                gl: query.gl,
                hl: query.hl,
                location: query.location
            })
        });

        if (!response.ok) {
            const error = new Error(`Serper Bing API error: ${response.statusText}`);
            (error as any).status = response.status;
            throw error;
        }

        const data = await response.json() as SerperNewsSearchResponse;

        return { parsed: data };
    }
}

export const WORLD_COUNTRIES: Record<string, string> = {
    'US': 'United States',
    'UK': 'United Kingdom',
    'CA': 'Canada',
    'AU': 'Australia',
    'IN': 'India',
    'DE': 'Germany',
    'FR': 'France',
    'ES': 'Spain',
    'IT': 'Italy',
    'JP': 'Japan',
    'KR': 'South Korea',
    'BR': 'Brazil',
    'MX': 'Mexico',
    'RU': 'Russia',
    'CN': 'China',
    'NL': 'Netherlands',
    'SE': 'Sweden',
    'NO': 'Norway',
    'DK': 'Denmark',
    'FI': 'Finland',
    'PL': 'Poland',
    'TR': 'Turkey',
    'ZA': 'South Africa',
    'AR': 'Argentina',
    'CL': 'Chile',
    'CO': 'Colombia',
    'IL': 'Israel',
    'SG': 'Singapore',
    'MY': 'Malaysia',
    'ID': 'Indonesia',
    'TH': 'Thailand',
    'VN': 'Vietnam',
    'PH': 'Philippines',
    'NZ': 'New Zealand',
    'BE': 'Belgium',
    'CH': 'Switzerland',
    'AT': 'Austria',
    'PT': 'Portugal',
    'GR': 'Greece',
    'IE': 'Ireland'
};

export const WORLD_LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'it', name: 'Italian' },
    { code: 'ru', name: 'Russian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh-cn', name: 'Chinese (Simplified)' },
    { code: 'zh-tw', name: 'Chinese (Traditional)' },
    { code: 'ar', name: 'Arabic' },
    { code: 'hi', name: 'Hindi' },
    { code: 'nl', name: 'Dutch' },
    { code: 'sv', name: 'Swedish' },
    { code: 'fi', name: 'Finnish' },
    { code: 'da', name: 'Danish' },
    { code: 'pl', name: 'Polish' },
    { code: 'tr', name: 'Turkish' },
    { code: 'th', name: 'Thai' },
    { code: 'vi', name: 'Vietnamese' },
    { code: 'id', name: 'Indonesian' },
    { code: 'ms', name: 'Malay' },
    { code: 'no', name: 'Norwegian' },
    { code: 'cs', name: 'Czech' },
    { code: 'hu', name: 'Hungarian' },
    { code: 'el', name: 'Greek' },
    { code: 'he', name: 'Hebrew' },
    { code: 'ro', name: 'Romanian' },
    { code: 'uk', name: 'Ukrainian' }
];
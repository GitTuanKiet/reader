export interface WebSearchOptionalHeaderOptions {
    'X-Loc-City'?: string;
    'X-Loc-Country'?: string;
    'X-Loc-Timezone'?: string;
    'X-Loc-Lat'?: string;
    'X-Loc-Long'?: string;
    'X-Loc-State'?: string;
    'X-Loc-State-Name'?: string;
    'User-Agent'?: string;
}

export interface WebSearchApiResponse {
    web?: {
        results: SearchResult[];
    };
}

export interface SearchResult {
    title: string;
    url: string;
    description?: string;
}

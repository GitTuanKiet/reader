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
    web: any;
}

export interface SearchResult {
    url: string;
    title: string;
    description: string;
}
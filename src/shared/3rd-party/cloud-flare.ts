interface CloudFlareResponse<T> {
    result: T;
    success: boolean;
    errors: any[];
    messages: any[];
}

interface BrowserRenderedHTMLResult {
    html: string;
}

export class CloudFlareHTTP {
    private baseUrl = 'https://api.cloudflare.com/client/v4';

    constructor(
        private account: string,
        private key: string
    ) { }

    async fetchBrowserRenderedHTML(params: { url: string; }): Promise<{ parsed: { result: string; }; }> {
        const endpoint = `${this.baseUrl}/accounts/${this.account}/browser_rendering/screenshot`;

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.key}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: params.url,
                output_html: true,
            }),
        });

        if (!response.ok) {
            throw new Error(`CloudFlare API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as CloudFlareResponse<BrowserRenderedHTMLResult>;

        return {
            parsed: {
                result: data.result.html
            }
        };
    }
}

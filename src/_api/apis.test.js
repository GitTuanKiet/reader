const ADAPTIVE_CRAWLER_URL = process.env.ADAPTIVE_CRAWLER_URL || 'http://localhost:4446';
const CRAWLER_URL = process.env.CRAWLER_URL || 'http://localhost:4444';
const SEARCHER_URL = process.env.SEARCHER_URL || 'http://localhost:4445';

// Auth token if required
const AUTH_TOKEN = process.env.AUTH_TOKEN;
console.log('Using AUTH_TOKEN:', AUTH_TOKEN
    ? 'Yes'
    : 'No');


async function testAdaptiveCrawler(
    url,
    options = {}
) {
    console.log(`Testing Adaptive Crawler with URL: ${url}`);

    const requestOptions = {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            ...(AUTH_TOKEN && { 'Authorization': `Bearer ${AUTH_TOKEN}` }),
            'X-Use-Sitemap': options.useSitemap !== undefined ? String(options.useSitemap) : 'true',
            'X-Max-Pages': String(options.maxPages || 10),
        },
        body: JSON.stringify({
            url
        })
    };

    try {
        const response = await fetch(ADAPTIVE_CRAWLER_URL, requestOptions);
        const data = await response.text();
        console.log('Adaptive Crawler Response:', JSON.stringify(data, null, 2));
        return JSON.parse(data);
    } catch (error) {
        console.error('Error testing Adaptive Crawler:', error);
        throw error;
    }
}

async function testAdaptiveCrawlerStatus(taskId) {
    console.log(`Checking status of Adaptive Crawler task: ${taskId}`);

    const requestOptions = {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            ...(AUTH_TOKEN && { 'Authorization': `Bearer ${AUTH_TOKEN}` })
        },
        body: JSON.stringify({
            taskId
        })
    };

    try {
        const response = await fetch(ADAPTIVE_CRAWLER_URL, requestOptions);
        const data = await response.text();
        console.log('Adaptive Crawler Status:', JSON.stringify(data, null, 2));
        return JSON.parse(data);
    } catch (error) {
        console.error('Error checking Adaptive Crawler status:', error);
        throw error;
    }
}

async function testCrawler(
    url,
    options = {}
) {
    console.log(`Testing Crawler with URL: ${url}`);

    const requestOptions = {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            ...(AUTH_TOKEN && { 'Authorization': `Bearer ${AUTH_TOKEN}` }),
            ...(options.respondWith && { 'X-Respond-With': options.respondWith }),
            ...(options.targetSelector && { 'X-Target-Selector': Array.isArray(options.targetSelector) ? options.targetSelector.join(', ') : options.targetSelector }),
            ...(options.waitForSelector && { 'X-Wait-For-Selector': Array.isArray(options.waitForSelector) ? options.waitForSelector.join(', ') : options.waitForSelector }),
            ...(options.removeSelector && { 'X-Remove-Selector': Array.isArray(options.removeSelector) ? options.removeSelector.join(', ') : options.removeSelector }),
            ...(options.withGeneratedAlt && { 'X-With-Generated-Alt': 'true' }),
            ...(options.retainImages && { 'X-Retain-Images': options.retainImages }),
            ...(options.timeout && { 'X-Timeout': String(options.timeout) }),
            "x-with-links-summary": "all",
        },
        body: JSON.stringify({
            url
        })
    };

    try {
        // You can also use the URL directly in the fetch for GET requests
        const response = await fetch(CRAWLER_URL, requestOptions);
        const data = await response.text();
        console.log('Crawler Response:', JSON.stringify(JSON.parse(data), null, 2));
        return JSON.parse(data);
    } catch (error) {
        console.error('Error testing Crawler:', error);
        throw error;
    }
}

async function testSearcher(
    query,
    maxResults = 5,
    options = {}
) {
    console.log(`Testing Searcher with query: ${query}`);

    const searchParams = {
        count: maxResults,
        type: options.type || 'web',
        provider: options.provider || 'google',
        num: options.num,
        gl: options.gl,
        hl: options.hl,
        location: options.location,
        page: options.page,
        fallback: options.fallback !== undefined ? options.fallback : true,
        q: query,
        ...options
    };

    const useQueryString = options.useQueryString || true;

    let url = `${SEARCHER_URL}/${encodeURIComponent(query)}`;

    if (useQueryString) {
        const queryParams = new URLSearchParams();
        Object.entries(searchParams).forEach(([key, value]) => {
            if (value !== undefined) {
                queryParams.append(key, String(value));
            }
        });
        url = `${url}?${queryParams.toString()}`;
        console.log(`Using query string URL: ${url}`);
    }

    const requestOptions = {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            ...(AUTH_TOKEN && { 'Authorization': `Bearer ${AUTH_TOKEN}` })
        },
        body: useQueryString ? undefined : JSON.stringify(searchParams)
    };

    try {
        const response = await fetch(url, requestOptions);
        const data = await response.text();
        console.log('Searcher Response:', JSON.stringify(data, null, 2));
        return JSON.parse(data);
    } catch (error) {
        console.error('Error testing Searcher:', error);
        throw error;
    }
}

if (require.main === module) {
    const runTests = async () => {
        // Test Crawler
        // await testCrawler('https://github.com', {
        //     respondWith: 'markdown',
        //     withGeneratedAlt: true,
        //     retainImages: 'all',
        //     timeout: 30
        // });

        // Test Searcher
        // await testSearcher('github', 5);

        // Test Adaptive Crawler
        const adaptiveCrawlerResult = await testAdaptiveCrawler('https://github.com', {
            useSitemap: false,
            maxPages: 5,
        });

        // If there's a taskId, check its status
        if (adaptiveCrawlerResult.data.taskId) {
            let resp = await testAdaptiveCrawlerStatus(adaptiveCrawlerResult.data.taskId);

            while (!["error", "completed"].includes(resp.data.status)) {
                console.log('Waiting for Adaptive Crawler task to complete...');
                await new Promise(resolve => setTimeout(resolve, 3000));
                resp = await testAdaptiveCrawlerStatus(adaptiveCrawlerResult.data.taskId);
            }
        }
    };

    runTests().catch(console.error);
}

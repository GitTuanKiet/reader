import { singleton } from 'tsyringe';
import { GlobalLogger } from '../../services/logger';
import { marshalErrorLike } from 'civkit/lang';
import _ from 'lodash';

interface ProxyConfig {
    url: URL;
    type: string;
    region?: string;
    weight?: number;
    lastUsed?: number;
}

@singleton()
export class ProxyProviderService {
    private proxyConfigs: Map<string, ProxyConfig[]> = new Map();
    private logger;

    private lastUsedTimestamps: Map<string, number> = new Map();

    constructor(protected globalLogger: GlobalLogger) {
        this.logger = this.globalLogger.child({ service: this.constructor.name });
        this.initializeProxies();
    }

    private initializeProxies() {
        // Default proxies - in production these might come from env variables or a database
        this.addProxy('default', new URL('http://proxy-default.example.com:8080'));
        this.addProxy('residential', new URL('http://proxy-residential.example.com:8080'));
        this.addProxy('datacenter', new URL('http://proxy-datacenter.example.com:8080'));
        this.addProxy('mobile', new URL('http://proxy-mobile.example.com:8080'));

        // Add regionally specific proxies
        this.addProxy('us', new URL('http://proxy-us.example.com:8080'), 'us');
        this.addProxy('eu', new URL('http://proxy-eu.example.com:8080'), 'eu');
        this.addProxy('asia', new URL('http://proxy-asia.example.com:8080'), 'asia');

        // Read from environment variables if available
        this.loadProxiesFromEnvironment();

        this.logger.info(`Initialized proxy provider with ${this.getTotalProxyCount()} proxies`);
    }

    private loadProxiesFromEnvironment() {
        try {
            // Get proxies from environment variables
            const envProxies = process.env.PROXY_URLS;
            const envTypes = process.env.PROXY_TYPES;

            if (envProxies) {
                const proxyUrls = envProxies.split(',');
                const proxyTypes = envTypes ? envTypes.split(',') : [];

                proxyUrls.forEach((proxyUrl, index) => {
                    try {
                        const type = index < proxyTypes.length ? proxyTypes[index] : 'default';
                        this.addProxy(type, new URL(proxyUrl.trim()));
                    } catch (err: any) {
                        this.logger.warn(`Invalid proxy URL: ${proxyUrl}`, { err: marshalErrorLike(err) });
                    }
                });
            }
        } catch (err: any) {
            this.logger.warn('Failed to load proxies from environment', { err: marshalErrorLike(err) });
        }
    }

    /**
     * Add a proxy to the configuration
     *
     * @param type The type of the proxy
     * @param url The URL of the proxy
     * @param region Optional region of the proxy
     * @param weight Optional weight for load balancing
     */
    public addProxy(type: string, url: URL, region?: string, weight: number = 1) {
        if (!this.proxyConfigs.has(type)) {
            this.proxyConfigs.set(type, []);
        }

        this.proxyConfigs.get(type)!.push({
            url,
            type,
            region,
            weight,
        });
    }

    private getTotalProxyCount(): number {
        let count = 0;
        this.proxyConfigs.forEach(proxies => {
            count += proxies.length;
        });
        return count;
    }

    public async alloc(type?: string): Promise<URL> {
        // If no type is specified, use default
        type = type || 'default';

        try {
            // Get proxies of the specified type
            let proxies = this.proxyConfigs.get(type);

            // If no proxies of the specified type, fall back to default
            if (!proxies || proxies.length === 0) {
                this.logger.warn(`No proxies of type ${type} available, falling back to default`);
                proxies = this.proxyConfigs.get('default');

                // If still no proxies, throw error
                if (!proxies || proxies.length === 0) {
                    throw new Error(`No proxies available for type ${type} and no default fallback`);
                }
            }

            // Sort by last used time to implement rotation
            proxies = _.sortBy(proxies, proxy => {
                const proxyKey = `${proxy.type}:${proxy.url.toString()}`;
                return this.lastUsedTimestamps.get(proxyKey) || 0;
            });

            // Get the least recently used proxy
            const proxy = proxies[0];
            const proxyKey = `${proxy.type}:${proxy.url.toString()}`;

            // Update the last used timestamp
            this.lastUsedTimestamps.set(proxyKey, Date.now());

            this.logger.debug(`Allocated proxy of type ${type}`, {
                proxyUrl: proxy.url.toString(),
                proxyType: proxy.type,
                proxyRegion: proxy.region
            });

            return proxy.url;
        } catch (err: any) {
            this.logger.error(`Failed to allocate proxy of type ${type}`, { err: marshalErrorLike(err) });
            throw err;
        }
    }

    async* iterAlloc(type?: string): AsyncGenerator<URL> {
        // If no type is specified, use default
        type = type || 'default';
        try {
            // Get proxies of the specified type
            let proxies = this.proxyConfigs.get(type);
            // If no proxies of the specified type, fall back to default
            if (!proxies || proxies.length === 0) {
                this.logger.warn(`No proxies of type ${type} available, falling back to default`);
                proxies = this.proxyConfigs.get('default');
                // If still no proxies, throw error
                if (!proxies || proxies.length === 0) {
                    throw new Error(`No proxies available for type ${type} and no default fallback`);
                }
            }
            // Sort by last used time to implement rotation
            proxies = _.sortBy(proxies, proxy => {
                const proxyKey = `${proxy.type}:${proxy.url.toString()}`;
                return this.lastUsedTimestamps.get(proxyKey) || 0;
            });
            // Get the least recently used proxy
            for (const proxy of proxies) {
                const proxyKey = `${proxy.type}:${proxy.url.toString()}`;
                // Update the last used timestamp
                this.lastUsedTimestamps.set(proxyKey, Date.now());
                this.logger.debug(`Allocated proxy of type ${type}`, {
                    proxyUrl: proxy.url.toString(),
                    proxyType: proxy.type,
                    proxyRegion: proxy.region
                });
                yield proxy.url;
            }
        } catch (err: any) {
            this.logger.error(`Failed to allocate proxy of type ${type}`, { err: marshalErrorLike(err) });
            throw err;
        }
    }

    /**
     * Remove a proxy from the pool (e.g., if it's not working)
     *
     * @param url The URL of the proxy to remove
     */
    public removeProxy(url: URL): void {
        this.proxyConfigs.forEach((proxies, type) => {
            const index = proxies.findIndex(p => p.url.toString() === url.toString());
            if (index !== -1) {
                proxies.splice(index, 1);
                this.logger.info(`Removed proxy ${url.toString()} of type ${type}`);
            }
        });
    }

    public supports(s?: string): boolean {

        return true;
    }
}

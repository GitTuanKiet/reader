import { AsyncService } from 'civkit';
import { singleton } from 'tsyringe';
import { Logger } from './logger';

type RotationStrategy = 'sequential' | 'random';

interface RequiredSecrets {
    BRAVE_SEARCH_API_KEYS: string[];
    BRAVE_SEARCH_API_KEY_ROTATION?: RotationStrategy;
    SERPER_SEARCH_API_KEYS: string[];
    SERPER_SEARCH_API_KEY_ROTATION?: RotationStrategy;
    JINA_EMBEDDINGS_DASHBOARD_API_KEY?: string;
    CLOUD_FLARE_API_KEY?: string;
}

@singleton()
export class SecretExposer extends AsyncService {
    private secrets: RequiredSecrets = {
        BRAVE_SEARCH_API_KEYS: [],
        BRAVE_SEARCH_API_KEY_ROTATION: 'sequential',
        SERPER_SEARCH_API_KEYS: [],
        SERPER_SEARCH_API_KEY_ROTATION: 'sequential'
    };

    private currentKeyIndex = 0;
    private currentSerperKeyIndex = 0;

    constructor(
        protected globalLogger: Logger,
    ) {
        super(...arguments);
    }

    get BRAVE_SEARCH_API_KEY() {
        return this.getNextBraveApiKey();
    }

    get SERPER_SEARCH_API_KEY() {
        return this.getNextSerperApiKey();
    }

    get JINA_EMBEDDINGS_DASHBOARD_API_KEY() {
        return this.secrets.JINA_EMBEDDINGS_DASHBOARD_API_KEY || process.env.JINA_EMBEDDINGS_DASHBOARD_API_KEY || '';
    }

    get CLOUD_FLARE_API_KEY() {
        return this.secrets.CLOUD_FLARE_API_KEY || process.env.CLOUD_FLARE_API_KEY || '';
    }

    private getNextBraveApiKey(): string {
        const keys = this.secrets.BRAVE_SEARCH_API_KEYS;
        if (keys.length === 0) {
            throw new Error('No Brave Search API keys available');
        }

        if (this.secrets.BRAVE_SEARCH_API_KEY_ROTATION === 'random') {
            return keys[Math.floor(Math.random() * keys.length)];
        }

        // Sequential rotation
        const key = keys[this.currentKeyIndex];
        this.currentKeyIndex = (this.currentKeyIndex + 1) % keys.length;
        return key;
    }

    private getNextSerperApiKey(): string {
        const keys = this.secrets.SERPER_SEARCH_API_KEYS;
        if (keys.length === 0) {
            throw new Error('No Serper Search API keys available');
        }

        if (this.secrets.SERPER_SEARCH_API_KEY_ROTATION === 'random') {
            return keys[Math.floor(Math.random() * keys.length)];
        }

        // Sequential rotation
        const key = keys[this.currentSerperKeyIndex];
        this.currentSerperKeyIndex = (this.currentSerperKeyIndex + 1) % keys.length;
        return key;
    }

    override async init() {
        this.globalLogger.info('Initializing SecretExposer...');

        try {
            // Load and validate Brave API keys
            const braveKeys = process.env.BRAVE_SEARCH_API_KEYS?.split(',').map(k => k.trim()).filter(Boolean);
            if (!braveKeys?.length) {
                throw new Error('BRAVE_SEARCH_API_KEYS environment variable is required (comma-separated)');
            }
            this.secrets.BRAVE_SEARCH_API_KEYS = braveKeys;

            // Load Brave rotation strategy
            const braveRotationStrategy = process.env.BRAVE_SEARCH_API_KEY_ROTATION as RotationStrategy;
            if (braveRotationStrategy && ['sequential', 'random'].includes(braveRotationStrategy)) {
                this.secrets.BRAVE_SEARCH_API_KEY_ROTATION = braveRotationStrategy;
            }

            // Load and validate Serper API keys
            const serperKeys = process.env.SERPER_SEARCH_API_KEYS?.split(',').map(k => k.trim()).filter(Boolean);
            if (!serperKeys?.length) {
                this.globalLogger.warn('SERPER_SEARCH_API_KEYS environment variable is not set or empty (comma-separated)');
                // Use a single key if multi-key format is not provided
                const singleKey = process.env.SERPER_SEARCH_API_KEY?.trim();
                if (singleKey) {
                    this.secrets.SERPER_SEARCH_API_KEYS = [singleKey];
                } else {
                    throw new Error('Either SERPER_SEARCH_API_KEYS or SERPER_SEARCH_API_KEY environment variable is required');
                }
            } else {
                this.secrets.SERPER_SEARCH_API_KEYS = serperKeys;
            }

            // Load Serper rotation strategy
            const serperRotationStrategy = process.env.SERPER_SEARCH_API_KEY_ROTATION as RotationStrategy;
            if (serperRotationStrategy && ['sequential', 'random'].includes(serperRotationStrategy)) {
                this.secrets.SERPER_SEARCH_API_KEY_ROTATION = serperRotationStrategy;
            }

            // Load Jina Embeddings API key
            this.secrets.JINA_EMBEDDINGS_DASHBOARD_API_KEY = process.env.JINA_EMBEDDINGS_DASHBOARD_API_KEY;

            // Load Cloudflare API key
            this.secrets.CLOUD_FLARE_API_KEY = process.env.CLOUD_FLARE_API_KEY;

            this.globalLogger.info('SecretExposer initialized successfully', {
                braveKeyCount: braveKeys.length,
                braveRotationStrategy: this.secrets.BRAVE_SEARCH_API_KEY_ROTATION,
                serperKeyCount: this.secrets.SERPER_SEARCH_API_KEYS.length,
                serperRotationStrategy: this.secrets.SERPER_SEARCH_API_KEY_ROTATION,
                hasJinaKey: !!this.secrets.JINA_EMBEDDINGS_DASHBOARD_API_KEY,
                hasCloudFlareKey: !!this.secrets.CLOUD_FLARE_API_KEY
            });

            this.emit('ready');
        } catch (error) {
            this.globalLogger.error('Failed to initialize SecretExposer', { error });
            throw error;
        }
    }
}

export default new SecretExposer(console as any);

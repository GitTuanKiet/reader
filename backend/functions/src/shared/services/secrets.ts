import { AsyncService } from 'civkit';
import { singleton } from 'tsyringe';
import { Logger } from './logger';

type RotationStrategy = 'sequential' | 'random';

interface RequiredSecrets {
    BRAVE_SEARCH_API_KEYS: string[];
    BRAVE_SEARCH_API_KEY_ROTATION?: RotationStrategy;
}

@singleton()
export class SecretExposer extends AsyncService {
    private secrets: RequiredSecrets = {
        BRAVE_SEARCH_API_KEYS: [],
        BRAVE_SEARCH_API_KEY_ROTATION: 'sequential'
    };

    private currentKeyIndex = 0;

    constructor(
        protected globalLogger: Logger,
    ) {
        super(...arguments);
    }

    get BRAVE_SEARCH_API_KEY() {
        return this.getNextBraveApiKey();
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

    override async init() {
        this.globalLogger.info('Initializing SecretExposer...');

        try {
            // Load and validate API keys
            const braveKeys = process.env.BRAVE_SEARCH_API_KEYS?.split(',').map(k => k.trim()).filter(Boolean);
            if (!braveKeys?.length) {
                throw new Error('BRAVE_SEARCH_API_KEYS environment variable is required (comma-separated)');
            }

            this.secrets.BRAVE_SEARCH_API_KEYS = braveKeys;

            // Load rotation strategy
            const rotationStrategy = process.env.BRAVE_SEARCH_API_KEY_ROTATION as RotationStrategy;
            if (rotationStrategy && ['sequential', 'random'].includes(rotationStrategy)) {
                this.secrets.BRAVE_SEARCH_API_KEY_ROTATION = rotationStrategy;
            }

            this.globalLogger.info('SecretExposer initialized successfully', {
                keyCount: braveKeys.length,
                rotationStrategy: this.secrets.BRAVE_SEARCH_API_KEY_ROTATION
            });

            this.emit('ready');
        } catch (error) {
            this.globalLogger.error('Failed to initialize SecretExposer', { error });
            throw error;
        }
    }
}

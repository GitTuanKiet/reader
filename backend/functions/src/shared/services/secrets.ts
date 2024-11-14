import { AsyncService } from 'civkit';
import { singleton } from 'tsyringe';
import { Logger } from './logger';

@singleton()
export class SecretExposer extends AsyncService {
    BRAVE_SEARCH_API_KEY: string = 'mock_brave_search_api_key';

    constructor(
        protected globalLogger: Logger,
    ) {
        super(...arguments);
    }

    override async init() {
        // Mock initialization
        this.globalLogger.info('SecretExposer initialized');
        this.emit('ready');
    }
}
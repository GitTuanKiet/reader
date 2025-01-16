import { AsyncService } from 'civkit/async-service';
import { singleton } from 'tsyringe';
import { Logger } from './logger';

export type LLMOptions = {
    system?: string;
    stream?: boolean;
    modelSpecific?: {
        top_k?: number;
        temperature?: number;
        repetition_penalty?: number;
        presence_penalty?: number;
        max_tokens?: number;
    };
};

@singleton()
export class LLMManager extends AsyncService {
    logger = this.globalLogger.child({ service: this.constructor.name });

    constructor(protected globalLogger: Logger) {
        super();
    }

    override async init() {
        this.emit('ready');
    }

    async* iterRun(model: string, config: {
        prompt: string | (string | URL | Buffer)[];
        options?: LLMOptions;
    }) {
        const mockResponses = {
            'vertex-gemini-1.5-flash-002': [
                '# Page Title\n\n',
                'This is a sample markdown content\n\n',
                '## Section 1\n\n',
                'Some content for section 1\n\n',
                '## Section 2\n\n',
                'Final section content'
            ],
            'readerlm-v2': [
                '{\n',
                '  "title": "Sample Page",\n',
                '  "content": "Sample content",\n',
                '  "sections": []\n',
                '}'
            ]
        };

        const responses = mockResponses[model as keyof typeof mockResponses] || ['Mock response'];

        for (const response of responses) {
            await new Promise(resolve => setTimeout(resolve, 100));
            yield response;
        }
    }
}

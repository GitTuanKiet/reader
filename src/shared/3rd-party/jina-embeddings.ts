import { AxiosResponse } from 'axios';
import logger from '../../services/logger';

const jinaLogger = logger.child({ service: 'JinaEmbeddingsAPI' });

export interface JinaUserInfo {
    user_id: string;
    email?: string;
    name?: string;
    wallet: {
        total_balance: number;
        usage?: number;
    };
    [key: string]: any;
}

export interface JinaTokenValidationResponse {
    data: JinaUserInfo;
}

export interface JinaUsageReportRequest {
    model_name: string;
    api_endpoint: string;
    consumer: {
        id: string;
        user_id: string;
    };
    usage: {
        total_tokens: number;
    };
    labels: {
        model_name: string;
    };
}

export class JinaEmbeddingsDashboardHTTP {
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
        jinaLogger.debug('Initialized Jina Embeddings mock client');
    }

    async validateToken(token: string): Promise<JinaTokenValidationResponse> {
        jinaLogger.debug('Mock: Validating Jina token - always succeeds', this.apiKey);

        return {
            data: {
                uid: 'admin',
                user_id: 'admin',
                email: 'admin@admin.com',
                name: 'admin',
                wallet: {
                    total_balance: 1_000_000_000,
                    usage: 0
                },
                customRateLimits: {}
            }
        };
    }

    async reportUsage(token: string, reportData: JinaUsageReportRequest): Promise<AxiosResponse> {
        jinaLogger.debug('Mock: Reporting usage to Jina', {
            model: reportData.model_name,
            tokens: reportData.usage.total_tokens
        });

        return {
            status: 200,
            statusText: 'OK',
            data: { success: true },
            headers: {},
            config: {} as any
        } as AxiosResponse;
    }

    async encode(token: string, texts: string[], model: string = 'jina-embeddings-v2'): Promise<AxiosResponse> {
        jinaLogger.debug('Mock: Encoding texts with Jina', {
            model,
            textCount: texts.length
        });

        // Create mock embeddings - 1024-dimension vector for each text
        const mockEmbeddings = texts.map(() =>
            Array(1024).fill(0).map(() => Math.random())
        );

        return {
            status: 200,
            statusText: 'OK',
            data: {
                data: mockEmbeddings.map((embedding, i) => ({
                    embedding,
                    index: i,
                    object: 'embedding'
                })),
                model,
                object: 'list',
                usage: {
                    prompt_tokens: texts.join(' ').split(' ').length,
                    total_tokens: texts.join(' ').split(' ').length
                }
            },
            headers: {},
            config: {} as any
        } as AxiosResponse;
    }
}

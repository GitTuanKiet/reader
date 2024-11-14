import { JinaEmbeddingsTokenAccount } from '../db/jina-embeddings-token-account';
import { RateLimitDesc } from '../services/rate-limit';

export class JinaEmbeddingsAuthDTO {
    bearerToken?: string;
    constructor(bearerToken?: string) {
        this.bearerToken = bearerToken;
    }

    solveUID(...args: any[]): Promise<string | undefined> {
        return Promise.resolve(undefined);
    }

    assertUser(...args: any[]): Promise<JinaEmbeddingsTokenAccount> {
        return Promise.resolve(new JinaEmbeddingsTokenAccount('', '', { total_balance: 1_000_000 }, {}));
    }

    getRateLimits(...args: any[]): RateLimitDesc[] {
        return [];
    }

    reportUsage(...args: any[]): Promise<void> {
        return Promise.resolve();
    }
}
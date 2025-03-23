import { Also, parseJSONText, Prop } from 'civkit';
import { FirestoreRecord } from '../lib/firestore';
import _ from 'lodash';

@Also({
    dictOf: Object
})
export class JinaEmbeddingsTokenAccount extends FirestoreRecord {
    static override collectionName = 'jina-embeddings-token-accounts';

    override _id!: string;

    @Prop()
    user_id!: string;

    @Prop()
    full_name!: string;

    @Prop()
    wallet!: {
        total_balance: number;
    };

    @Prop()
    metadata!: Record<string, any>;

    @Prop()
    lastSyncedAt?: Date;

    @Prop()
    customRateLimits?: Record<string, any[]>;

    static patchedFields = [
        'wallet',
        'metadata',
        'customRateLimits'
    ];

    static override from(input: any) {
        for (const field of this.patchedFields) {
            if (typeof input[field] === 'string') {
                input[field] = parseJSONText(input[field]);
            }
        }

        return super.from(input) as JinaEmbeddingsTokenAccount;
    }

    override degradeForFireStore() {
        const copy: any = { ...this };

        for (const field of (this.constructor as typeof JinaEmbeddingsTokenAccount).patchedFields) {
            if (typeof copy[field] === 'object') {
                copy[field] = JSON.stringify(copy[field]) as any;
            }
        }

        return copy;
    }

    static override async save(data: any, id?: string, options?: any) {
        if (!id && data._id) {
            id = data._id;
        }

        await super.save(data);
    }
}
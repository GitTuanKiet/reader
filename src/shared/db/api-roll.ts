import { Also, parseJSONText, Prop } from 'civkit';
import { FirestoreRecord } from '../lib/firestore';
import _ from 'lodash';

export const API_CALL_STATUS = {
    SUCCESS: 'success',
    ERROR: 'error',
    RATE_LIMITED: 'rate_limited',
};

@Also({
    dictOf: Object
})
export class ApiRoll extends FirestoreRecord {
    static override collectionName = 'api-rolls';

    override _id!: string;

    @Prop()
    user_id!: string;

    @Prop()
    api_key!: string;

    @Prop()
    rate_limit?: {
        total: number;
        remaining: number;
        reset: Date;
    };

    @Prop()
    lastSyncedAt?: Date;

    static patchedFields = [
        'rate_limit'
    ];

    static override from(input: any) {
        for (const field of this.patchedFields) {
            if (typeof input[field] === 'string') {
                input[field] = parseJSONText(input[field]);
            }
        }

        return super.from(input) as ApiRoll;
    }

    override degradeForFireStore() {
        const copy: any = { ...this };

        for (const field of (this.constructor as typeof ApiRoll).patchedFields) {
            if (typeof copy[field] === 'object') {
                copy[field] = JSON.stringify(copy[field]) as any;
            }
        }

        return copy;
    }
}
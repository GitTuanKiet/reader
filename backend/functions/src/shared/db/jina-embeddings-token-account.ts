export class JinaEmbeddingsTokenAccount {
    user_id: string;
    full_name: string;
    wallet: {
        total_balance: number;
    };
    metadata: Record<string, any>;

    constructor(
        user_id: string,
        full_name: string,
        wallet: {
            total_balance: number;
        },
        metadata: Record<string, any>
    ) {
        this.user_id = user_id;
        this.full_name = full_name;
        this.wallet = wallet;
        this.metadata = metadata;
    }
}
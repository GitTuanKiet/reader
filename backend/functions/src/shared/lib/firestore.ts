import { Prop } from 'civkit';

export class FirestoreRecord {
    static collectionName: string;

    @Prop()
    _id!: string;

    // Phương thức from sẽ trả về instance của lớp gọi phương thức, tức là lớp con
    static from(input: any): any {
        const instance = new this();  // 'this' sẽ là lớp gọi phương thức, có thể là lớp con
        Object.assign(instance, input);
        return instance;
    }

    static async fromFirestore(id: string) {
        // Mock implementation
        console.log(`Fetching document with id ${id} from collection ${this.collectionName}`);
        const mock: any = undefined;
        if (!mock) {
            return;
        }

        return this.from(mock);
    }

    static async fromFirestoreQuery(query: any) {
        // Mock implementation
        console.log(`Executing query on collection ${this.collectionName}`);
        const mock: any[] = [];

        return mock.map(this.from);
    }

    static async save(data: any): Promise<void> {
        // Mock implementation
        console.log(`Saving data to collection ${this.collectionName}`);
    }

    degradeForFireStore(): any {
        // Default implementation
        return { ...this };
    }

    static COLLECTION = {
        doc: (id: string) => ({
            set: async (data: any, options?: any) => {
                console.log(`Setting document ${id} in collection ${this.collectionName}`);
            },
            update: async (data: any) => {
                console.log(`Updating document ${id} in collection ${this.collectionName}`);
            },
        }),
        where: (field: string, operator: string, value: any) => ({
            get: async () => ({
                docs: []
            }),
            orderBy: (field: string, direction: string) => ({
                limit: (limit: number) => ({
                    docs: []
                })
            }),
            where: (field: string, operator: string, value: any) => ({
                limit: (limit: number) => ({
                    docs: []
                }),
                orderBy: (field: string, direction: string) => ({
                    limit: (limit: number) => ({
                        docs: []
                    }),
                    offset: (offset: number) => ({
                        docs: [],
                        limit: (limit: number) => ({
                            docs: [],
                            count: () => ({
                                get: async () => ({
                                    data: () => ({ count: 0 })
                                })
                            }),
                        }),
                    }),
                }),
            }),
        }),
    };

    static DB = {
        runTransaction: async (callback: (transaction: any) => Promise<void>) => {
            console.log('Running Firestore transaction');
            await callback({
                get: () => ({
                    data: () => ({})
                }),
                set: () => {
                    console.log('Transaction set');
                },
                update: () => {
                    console.log('Transaction update');
                }
            });
        }
    };
};

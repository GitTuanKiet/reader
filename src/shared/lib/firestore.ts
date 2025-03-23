import { Prop } from 'civkit';
import { join } from 'path';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { Timestamp } from 'firebase-admin/firestore';


export class FirestoreRecord {
    private static dataDir = '.firebase/local-db';
    static collectionName: string;
    private static storagePath: string;

    @Prop()
    _id?: string;

    static from(input: any): any {
        for (const field of ['createdAt', 'finishedAt', 'expireAt', 'lastSyncedAt']) {
            if (input[field]) {
                input[field] = new Date(input[field]);
            }
        }

        const instance = new this();
        Object.assign(instance, input);

        return instance;
    }

    static async fromFirestore(id: string) {
        const collectionData = await this.getCollectionData();
        return collectionData[id] ? this.from(collectionData[id]) : undefined;
    }

    static async fromFirestoreQuery(query: any) {
        const collection = await this.getCollectionData();
        let results = Object.values(collection);
        results = applyQuery(results, query.filters, query.order, query.offsetCount, query.limitCount);
        return results.map(doc => this.from(doc));
    }

    static async save(data: any): Promise<void> {
        const collection = await this.getCollectionData();
        collection[data._id] = data;
        await this.updateCollectionData(collection);
    }

    degradeForFireStore() {
        return { ...this };
    }

    static get COLLECTION() {
        type BaseQueryType = {
            filters: { field: string; operator: string; value: any; }[];
            order: { field: string; direction: 'asc' | 'desc'; } | null;
            limitCount?: number;
            offsetCount: number;
            get: () => Promise<{ docs: { data: () => any; id: string; }[]; }>;
            orderBy: (orderField: string, direction?: 'asc' | 'desc') => BaseQueryType;
            limit: (limitCount: number) => BaseQueryType;
            offset: (offsetCount: number) => BaseQueryType;
            where: (nextField: string, nextOperator: string, nextValue: any) => BaseQueryType;
            count: () => {
                get: () => Promise<{ data: () => { count: number; }; }>;
            };
        };

        return {
            doc: (id: string) => ({
                get: async () => {
                    const data = await this.fromFirestore(id);
                    for (const field of ['createdAt']) {
                        if (data[field]) {
                            data[field] = Timestamp.fromDate(data[field]);
                        }
                    }

                    return {
                        data: () => data
                    };
                },
                set: async (data: any, options?: any) => {
                    const collection = await this.getCollectionData();
                    collection[id] = { ...data, _id: id };
                    await this.updateCollectionData(collection);
                },
                update: async (data: any) => {
                    const collection = await this.getCollectionData();
                    collection[id] = { ...collection[id], ...data, _id: id };
                    await this.updateCollectionData(collection);
                },
            }),
            where: (field: string, operator: string, value: any) => {
                const baseQuery: BaseQueryType = {
                    filters: [{ field, operator, value }],
                    order: null,
                    offsetCount: 0,
                    get: async () => {
                        const data = await this.getCollectionData();
                        let results = Object.values(data);
                        results = applyQuery(results, baseQuery.filters, baseQuery.order, baseQuery.offsetCount, baseQuery.limitCount);
                        return {
                            docs: results.map(doc => ({
                                data: () => doc,
                                id: doc._id
                            }))
                        };
                    },
                    orderBy: (orderField: string, direction: 'asc' | 'desc' = 'asc') => {
                        baseQuery.order = { field: orderField, direction };
                        return baseQuery;
                    },
                    limit: (limitCount: number) => {
                        baseQuery.limitCount = limitCount;
                        return baseQuery;
                    },
                    offset: (offsetCount: number) => {
                        baseQuery.offsetCount = offsetCount;
                        return baseQuery;
                    },
                    where: (nextField: string, nextOperator: string, nextValue: any) => {
                        baseQuery.filters.push({ field: nextField, operator: nextOperator, value: nextValue });
                        return baseQuery;
                    },
                    count: () => {
                        return {
                            get: async () => {
                                const results = await baseQuery.get();
                                return {
                                    data: () => ({ count: results.docs.length })
                                };
                            }
                        };
                    }
                };
                return baseQuery;
            }
        };
    }

    static get DB() {
        type TransactionType = {
            get: (docRef: any) => Promise<{ data: () => Record<string, any>; }>;
            set: (docRef: any, data: any) => Promise<void>;
            update: (docRef: any, data: any) => Promise<void>;
        };

        const transaction: TransactionType = {
            get: async (docRef: any) => {
                return await docRef.get();
            },
            set: async (docRef: any, data: any) => {
                await docRef.set(data);
            },
            update: async (docRef: any, data: any) => {
                await docRef.update(data);
            }
        };

        return {
            runTransaction: async (callback: (transaction: TransactionType) => Promise<void>) => {
                await callback(transaction);
            }
        };
    };

    static get OPS() {
        return {
            increment: (amount: number) => ({
                _type: 'increment',
                amount
            }),
            arrayUnion: (...elements: any[]) => ({
                _type: 'arrayUnion',
                elements
            }),
            arrayRemove: (...elements: any[]) => ({
                _type: 'arrayRemove',
                elements
            }),
            serverTimestamp: () => ({
                _type: 'serverTimestamp'
            })
        };
    }

    private static getStoragePath() {
        if (!this.storagePath) {
            if (!existsSync(this.dataDir)) {
                mkdirSync(this.dataDir, { recursive: true });
            }
            this.storagePath = join(this.dataDir, this.collectionName + '.json');
        }
        return this.storagePath;
    }

    private static async acquireLock(): Promise<void> {
        const lockPath = this.getStoragePath() + '.lock';
        while (existsSync(lockPath)) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        try {
            writeFileSync(lockPath, 'lock');
        } catch (err) {
            console.debug('Error acquiring lock', err);
        }
    }

    private static async releaseLock(): Promise<void> {
        const lockPath = this.getStoragePath() + '.lock';
        if (existsSync(lockPath)) {
            unlinkSync(lockPath);
        }
    }

    private static async getCollectionData(): Promise<Record<string, any>> {
        const collectionPath = this.getStoragePath();
        await this.acquireLock();
        try {
            const data = await readFile(collectionPath, 'utf8');
            return data ? safeParse(data) : {};
        } catch (error: any) {
            // If file doesn't exist return empty object
            if (error.code === 'ENOENT') {
                mkdirSync(this.dataDir, { recursive: true });
                return {};
            }
            throw error;
        } finally {
            await this.releaseLock();
        }
    }

    private static async updateCollectionData(collection: Record<string, any>): Promise<void> {
        await this.acquireLock();
        try {
            await writeFile(this.getStoragePath(), safeStringify(collection), 'utf8');
        } finally {
            this.releaseLock();
        }
    }
}


function safeParse(str: string): any {
    try {
        return JSON.parse(str);
    } catch (error) {
        return {};
    }
}

function safeStringify(obj: any): string {
    return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'string') {
            return value;
        }
        return value;
    }, 2);
}

function applyQuery(
    results: any[],
    filters: { field: string; operator: string; value: any; }[],
    order: { field: string; direction: 'asc' | 'desc'; } | null,
    offsetCount: number = 0,
    limitCount?: number
): any[] {
    // Apply filters
    filters.forEach(({ field, operator, value }) => {
        results = results.filter(item => {
            switch (operator) {
                case '==': return item[field] === value;
                case '>': return item[field] > value;
                case '<': return item[field] < value;
                case '>=': return item[field] >= value;
                case '<=': return item[field] <= value;
                default: return true;
            }
        });
    });
    // Apply ordering
    if (order) {
        results.sort((a, b) => {
            const multiplier = order.direction === 'desc' ? -1 : 1;
            return multiplier * (a[order.field] > b[order.field] ? 1 : -1);
        });
    }
    // Apply offset and limit
    if (offsetCount) results = results.slice(offsetCount);
    if (limitCount !== undefined) results = results.slice(0, limitCount);
    return results;
}
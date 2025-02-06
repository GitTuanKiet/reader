import { Prop } from 'civkit';
import { randomUUID } from 'crypto';
import { join } from 'path';
import fs from 'fs';
import fsp from 'fs/promises';

export class FirestoreRecord {
    private static dataDir = '.firebase/local-db';
    static collectionName: string;

    @Prop()
    _id: string = randomUUID();

    protected static getCollectionName() {
        return this.collectionName || this.name.toLowerCase() + 's';
    }

    private static ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    private static getStoragePath() {
        this.ensureDataDir();
        return join(this.dataDir, this.getCollectionName() + '.json');
    }

    private static safeStringify(obj: any): string {
        return JSON.stringify(obj, (key, value) => {
            if (typeof value === 'string') {
                return value;
            }
            return value;
        }, 2);
    }

    private static safeParse(str: string): any {
        try {
            return JSON.parse(str);
        } catch (error) {
            return {};
        }
    }

    private static getCollectionData(): Record<string, any> {
        const collectionPath = this.getStoragePath();
        if (!fs.existsSync(collectionPath)) {
            return {};
        }
        const data = fs.readFileSync(collectionPath, 'utf8');
        return data ? this.safeParse(data) : {};
    }

    static from(input: any): any {
        const instance = new this();
        Object.assign(instance, input);
        return instance;
    }

    static async fromFirestore(id: string) {
        const collection = this.getCollectionData();
        return collection[id] ? this.from(collection[id]) : undefined;
    }

    static async fromFirestoreQuery(query: any) {
        if (query.results) {
            return query.results.map((item: any) => this.from(item));
        }
    }

    static async save(data: any): Promise<void> {
        const collection = this.getCollectionData();
        collection[data._id] = data;
        await fsp.writeFile(
            this.getStoragePath(),
            this.safeStringify(collection)
        );
    }

    degradeForFireStore(): any {
        return { ...this };
    }

    static get COLLECTION() {
        return {
            doc: (id: string) => ({
                set: async (data: any, options?: any) => {
                    const collection = this.getCollectionData();
                    collection[id] = data;
                    await fsp.writeFile(
                        this.getStoragePath(),
                        this.safeStringify(collection)
                    );
                },
                update: async (data: any) => {
                    const collection = this.getCollectionData();
                    collection[id] = { ...collection[id], ...data };
                    await fsp.writeFile(
                        this.getStoragePath(),
                        this.safeStringify(collection)
                    );
                },
            }),
            where: (field: string, operator: string, value: any) => {
                const collection = this.getCollectionData();
                let results = Object.values(collection);

                // Apply initial where filter
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

                const baseQuery = {
                    results,
                    get: async () => ({
                        docs: results.map(doc => ({
                            data: () => doc,
                            id: doc._id
                        }))
                    }),
                    orderBy: (orderField: string, direction: 'asc' | 'desc' = 'asc') => {
                        results.sort((a, b) => {
                            const multiplier = direction === 'desc' ? -1 : 1;
                            return multiplier * (a[orderField] > b[orderField] ? 1 : -1);
                        });
                        return {
                            limit: (limitCount: number) => {
                                results = results.slice(0, limitCount);
                                return baseQuery;
                            },
                            offset: (offsetCount: number) => {
                                results = results.slice(offsetCount);
                                return {
                                    ...baseQuery,
                                    limit: (limitCount: number) => {
                                        results = results.slice(0, limitCount);
                                        return {
                                            ...baseQuery,
                                            count: () => ({
                                                get: async () => ({
                                                    data: () => ({ count: results.length })
                                                })
                                            })
                                        };
                                    }
                                };
                            }
                        };
                    },
                    where: (nextField: string, nextOperator: string, nextValue: any) => {
                        // Apply additional where filters
                        results = results.filter(item => {
                            switch (nextOperator) {
                                case '==': return item[nextField] === nextValue;
                                case '>': return item[nextField] > nextValue;
                                case '<': return item[nextField] < nextValue;
                                case '>=': return item[nextField] >= nextValue;
                                case '<=': return item[nextField] <= nextValue;
                                default: return true;
                            }
                        });
                        return baseQuery;
                    },
                    limit: (limitCount: number) => {
                        results = results.slice(0, limitCount);
                        return baseQuery;
                    }
                };

                return baseQuery;
            }
        };
    }

    static DB = {
        runTransaction: async (callback: (transaction: any) => Promise<void>) => {
            await callback({
                get: async (path: string) => ({
                    data: async () => {
                        try {
                            const data = await fsp
                                .readFile(path, 'utf8');
                            return JSON.parse(data);
                        } catch (error) {
                            return null;
                        }
                    }
                }),
                set: async (path: string, data: any) => {
                    await fsp.writeFile(path, this.safeStringify(data));
                },
                update: async (path: string, data: any) => {
                    try {
                        const existing = this.safeParse(
                            await fsp.readFile(path, 'utf8')
                        );
                        const updated = { ...existing, ...data };
                        await fsp.writeFile(path, this.safeStringify(updated));
                    } catch (error) {
                        throw new Error('Document does not exist');
                    }
                }
            });
        }
    };
}

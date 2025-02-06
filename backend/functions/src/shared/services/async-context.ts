import { singleton } from 'tsyringe';
import { AbstractAsyncContext, TraceCtx } from 'civkit';
import { AsyncLocalStorage } from 'async_hooks';

@singleton()
export class AsyncContext extends AbstractAsyncContext {
    asyncLocalStorage: AsyncLocalStorage<any>;

    constructor() {
        super();
        this.asyncLocalStorage = new AsyncLocalStorage();
        this.init();
    }

    override setup(base: object = {}): TraceCtx {
        const currentCtx = this.asyncLocalStorage.getStore() || {};
        const newCtx = { ...currentCtx, ...base };
        this.asyncLocalStorage.enterWith(newCtx);
        return newCtx;
    }

    override get<T = any>(k: string | symbol): T | undefined {
        const ctx = this.asyncLocalStorage.getStore();
        if (!ctx) {
            return undefined;
        }
        return ctx[k];
    }

    override set<T = any>(k: string | symbol, v: T): T | undefined {
        const ctx = this.asyncLocalStorage.getStore();
        if (!ctx) {
            this.setup({});
        }
        const currentCtx = this.asyncLocalStorage.getStore();
        currentCtx[k] = v;
        return v;
    }
}
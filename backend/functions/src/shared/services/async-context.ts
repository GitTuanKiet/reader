import { singleton } from 'tsyringe';
import { AbstractAsyncContext } from 'civkit';

@singleton()
export class AsyncContext extends AbstractAsyncContext {

    constructor() {
        super(...arguments);
    }

    override async init() {
        await this.dependencyReady();

        this.emit('ready');
    }
}
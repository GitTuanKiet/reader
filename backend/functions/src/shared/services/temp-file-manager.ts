import { singleton } from 'tsyringe';
import { AbstractTempFileManger } from 'civkit';
import path from 'path';

@singleton()
export class TempFileManager extends AbstractTempFileManger {
    rootDir: string;

    constructor() {
        super(...arguments);
        this.rootDir = path.resolve('.firebase', 'temp');
    }

    override async init() {
        await this.dependencyReady();

        this.emit('ready');
    }
}
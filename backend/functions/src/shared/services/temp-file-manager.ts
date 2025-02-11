import { singleton } from 'tsyringe';
import { AbstractTempFileManger } from 'civkit';
import path from 'path';
import fs from 'fs';

@singleton()
export class TempFileManager extends AbstractTempFileManger {
    rootDir: string;

    constructor() {
        super(...arguments);
        this.rootDir = path.resolve('.firebase', 'temp');
        if (!fs.existsSync(this.rootDir)) {
            fs.mkdirSync(this.rootDir, { recursive: true });
        }
    }

    override async init() {
        await this.dependencyReady();

        this.emit('ready');
    }

    override alloc(relativePath?: string): string {
        const fpath = super.alloc(relativePath);
        if (!fs.existsSync(this.rootDir)) {
            fs.mkdirSync(this.rootDir, { recursive: true });
        }
        return fpath;
    }
}
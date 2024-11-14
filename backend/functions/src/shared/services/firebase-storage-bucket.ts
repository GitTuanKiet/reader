import { singleton } from 'tsyringe';
import { AsyncService } from 'civkit';
import fs from 'fs';
import path from 'path';
import { Gzip } from 'zlib';
import { getBaseUri } from '..';

@singleton()
export class FirebaseStorageBucketControl extends AsyncService {
    private localStorageDir: string;

    constructor() {
        super(...arguments);

        this.localStorageDir = path.resolve('.firebase');
        if (!fs.existsSync(this.localStorageDir)) {
            fs.mkdirSync(this.localStorageDir, { recursive: true });
        }
    }

    override async init() {
        await this.dependencyReady();

        this.emit('ready');
    }

    get bucket() {
        return {
            file: (filePath: string) => ({
                save: async (gzip: Gzip, options?: { contentType: 'application/jsonl+gzip'; }) => await fs.promises.writeFile(path.join(this.localStorageDir, `${filePath}.jsonl`), gzip),
                exists: async () => [fs.existsSync(path.join(this.localStorageDir, filePath))],
            })
        };
    }

    // async uploadFile(filePath: string, destination: string): Promise<string> {
    //     const destPath = path.join(this.localStorageDir, destination);
    //     await fs.promises.copyFile(filePath, destPath);
    //     return `file://${destPath}`;
    // }

    // async deleteFile(filePath: string): Promise<void> {
    //     const fullPath = path.join(this.localStorageDir, filePath);
    //     await fs.promises.unlink(fullPath);
    // }

    // async fileExists(filePath: string): Promise<boolean> {
    //     const fullPath = path.join(this.localStorageDir, filePath);
    //     return fs.existsSync(fullPath);
    // }

    async downloadFile(filePath: string | unknown): Promise<Buffer> {
        const sourcePath = path.join(this.localStorageDir, filePath as string);
        return await fs.promises.readFile(sourcePath);
    }

    async saveFile(
        filePath: string,
        content: Buffer,
        options?: {
            contentType?: string;
            metadata?: {
                contentType: string;
            };
        }
    ): Promise<void> {
        let ext = '';
        switch (options?.contentType || options?.metadata?.contentType) {
            case 'image/png':
                ext = '.png';
                break;
            case 'application/json':
                ext = '.json';
                break;
        }

        let finalFilePath = filePath;
        if (filePath.startsWith('screenshots/') || filePath.startsWith('pageshots/')) {
            finalFilePath = `instant-screenshots/${filePath.split('/').pop()}`;
        }

        const fullPath = path.join(this.localStorageDir, `${finalFilePath}${ext}`);
        await fs.promises.writeFile(fullPath, content);
    }

    async signDownloadUrl(filePath: string, expirationTime: number): Promise<string> {
        let finalFilePath = filePath;
        if (filePath.startsWith('screenshots/') || filePath.startsWith('pageshots/')) {
            finalFilePath = `instant-screenshots/${filePath.split('/').pop()}`;
        }

        if (!finalFilePath.endsWith('.png')) {
            finalFilePath += '.png';
        }

        const fullPath = path.join(this.localStorageDir, finalFilePath);
        if (!fs.existsSync(fullPath)) {
            throw new Error('Image not found');
        }

        return `${getBaseUri()}/${finalFilePath}`;
    }
}
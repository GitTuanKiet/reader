import { singleton } from 'tsyringe';
import { AsyncService } from 'civkit';

@singleton()
export class ImageInterrogationManager extends AsyncService {
    constructor() {
        super(...arguments);
    }

    override async init() {
        await this.dependencyReady();

        this.emit('ready');
    }

    async interrogate(serviceName: string, options: { image: Buffer, prompt?: string; }) {
        return `This is a description of the image at URL ${options.image.toString()}`;
    }
}

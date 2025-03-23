import { AsyncService } from 'civkit';
import { singleton } from 'tsyringe';
import { Logger } from './logger';
import { createCanvas, loadImage, Canvas, Image } from '@napi-rs/canvas';

@singleton()
export class CanvasService extends AsyncService {
    constructor(protected globalLogger: Logger) {
        super(...arguments);
    }

    override async init() {
        this.globalLogger.info('CanvasService initialized');
        this.emit('ready');
    }

    async loadImage(url: string): Promise<Image> {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return await loadImage(buffer);
    }

    fitImageToSquareBox(img: Image, size: number): Canvas {
        const canvas = createCanvas(size, size);
        const ctx = canvas.getContext('2d');

        const scale = Math.min(size / img.width, size / img.height);
        const x = (size - img.width * scale) / 2;
        const y = (size - img.height * scale) / 2;

        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

        return canvas;
    }

    async canvasToBuffer(canvas: Canvas, format: 'image/png'): Promise<Buffer> {
        return canvas.toBuffer(format);
    }
}

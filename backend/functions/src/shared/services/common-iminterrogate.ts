import { singleton } from 'tsyringe';
import { AsyncService } from 'civkit';
import OpenAI from 'openai';

let Replicate: any;
try {
    Replicate = require('replicate');
} catch { }

@singleton()
export class ImageInterrogationManager extends AsyncService {
    private openai: OpenAI;
    private replicate?: any;

    constructor() {
        super(...arguments);
        this.openai = new OpenAI({
            baseURL: process.env.OPENAI_BASE_URL,
            apiKey: process.env.OPENAI_API_KEY || (() => { throw new Error('OPENAI_API_KEY is not defined'); })(),
        });

        if (Replicate && process.env.REPLICATE_API_TOKEN) {
            try {
                this.replicate = new Replicate({
                    auth: process.env.REPLICATE_API_TOKEN,
                });
            } catch (error) {
                console.warn('Failed to initialize Replicate:', error);
            }
        }
    }

    override async init() {
        await this.dependencyReady();
        this.emit('ready');
    }

    private async openaiCaption(imageBuffer: Buffer, prompt?: string): Promise<string> {
        const base64Image = imageBuffer.toString('base64');

        const response = await this.openai.chat.completions.create({
            model: "gpt-4o-mini",
            // model: "gpt-4-vision-preview",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt || "Describe this image in a concise, accurate manner suitable for an alt text." },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/png;base64,${base64Image}`
                            }
                        }
                    ],
                }
            ],
            max_tokens: 150
        });

        return response.choices[0]?.message?.content || '';
    }

    private async replicateCaption(imageBuffer: Buffer, prompt?: string): Promise<string> {
        if (!this.replicate) {
            throw new Error('Replicate is not available');
        }

        const imageBase64 = imageBuffer.toString('base64');
        const output = await this.replicate.run(
            "salesforce/blip-2:4b32258c42e9efd4288bb9910bc532a69727f9acd26aa08e175713a0a857a608",
            {
                input: {
                    task: "image_captioning",
                    image: `data:image/png;base64,${imageBase64}`,
                    question: prompt
                }
            }
        );
        return output as unknown as string;
    }

    async interrogate(serviceName: string, options: { image: Buffer, prompt?: string; system?: string; }): Promise<string> {
        if (serviceName === 'blip2' && this.replicate) {
            try {
                return await this.replicateCaption(options.image, options.prompt);
            } catch (error) {
                console.warn('Replicate caption failed, falling back to OpenAI:', error);
            }
        }

        return this.openaiCaption(options.image, options.prompt);
    }
}

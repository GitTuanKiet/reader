import { AbstractPinoLogger } from 'civkit/pino-logger';
import { singleton, container } from 'tsyringe';
import { threadId } from 'node:worker_threads';
import { getTraceCtx } from 'civkit/async-context';


const levelToSeverityMap: { [k: string]: string | undefined; } = {
    trace: 'DEFAULT',
    debug: 'DEBUG',
    info: 'INFO',
    warn: 'WARNING',
    error: 'ERROR',
    fatal: 'CRITICAL',
};

@singleton()
export class GlobalLogger extends AbstractPinoLogger {
    loggerOptions = {
        level: 'debug',
        base: {
            tid: threadId,
        }
    };

    private initialized = false;

    constructor() {
        super();
        this.init();
    }

    override init(): void {
        if (this.initialized) return;

        if (process.env['NODE_ENV']?.startsWith('prod')) {
            super.init(process.stdout);
        } else {
            try {
                const PinoPretty = require('pino-pretty').PinoPretty;
                super.init(PinoPretty({
                    singleLine: true,
                    colorize: true,
                    messageFormat(log: any, messageKey: any) {
                        return `${log['tid'] ? `[${log['tid']}]` : ''}[${log['service'] || 'ROOT'}] ${log[messageKey]}`;
                    },
                }));
            } catch (error) {
                console.warn('pino-pretty not available, falling back to standard output');
                super.init(process.stdout);
            }
        }

        this.initialized = true;
        this.emit('ready');
    }

    override log(...args: any[]) {
        // Ensure we have a valid target stream before proceeding
        if (!this._targetStream) {
            // Fallback to stdout if not initialized yet
            console.warn('Logger used before fully initialized, falling back to console');
            console.log(...args);
            return true;
        }

        const [levelObj, ...rest] = args;
        const severity = levelToSeverityMap[levelObj?.level];
        const traceCtx = getTraceCtx();
        const patched: any = { ...levelObj, severity };
        const traceId = traceCtx?.googleTraceId || traceCtx?.traceId;
        if (traceId && process.env['GCLOUD_PROJECT']) {
            patched['logging.googleapis.com/trace'] = `projects/${process.env['GCLOUD_PROJECT']}/traces/${traceId}`;
        }
        return super.log(patched, ...rest);
    }
}

const instance = container.resolve(GlobalLogger);
export default instance;

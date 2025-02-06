import { injectable } from 'tsyringe';

@injectable()
export class Logger {
    private name: string = 'Logger';

    info(message: string, ...args: any[]) {
        console.log(`[${this.name}] INFO:`, message, ...args);
    }

    warn(message: string, ...args: any[]) {
        console.warn(`[${this.name}] WARN:`, message, ...args);
    }

    error(message: string, ...args: any[]) {
        console.error(`[${this.name}] ERROR:`, message, ...args);
    }

    debug(...args: any[]) {
        console.debug(`[${this.name}] DEBUG:`, ...args);
    }

    fatal(message: string, ...args: any[]) {
        console.error(`[${this.name}] FATAL:`, message, ...args);
    }

    trace(message: string, ...args: any[]) {
        console.trace(`[${this.name}] TRACE:`, message, ...args);
    }

    log(message: string, ...args: any[]) {
        console.log(`[${this.name}] LOG:`, message, ...args);
    }

    child(options: { service: string; }) {
        const child = new Logger();
        child.name = options.service;
        return child;
    }
}
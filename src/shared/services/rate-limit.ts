import { singleton } from 'tsyringe';
import { AsyncService, RPCReflection } from 'civkit';

export class RateLimitDesc {
    occurrence: string;
    periodSeconds: number;

    constructor(occurrence: string, periodSeconds: number) {
        this.occurrence = occurrence;
        this.periodSeconds = periodSeconds;
    }

    static from(input: any): RateLimitDesc {
        return new RateLimitDesc(input.occurrence, input.periodSeconds);
    }

    toString(): string {
        return `${this.occurrence}:${this.periodSeconds}`;
    }
}

@singleton()
export class RateLimitControl extends AsyncService {
    constructor() {
        super();
    }

    override async init() {
        // Mock implementation
        this.emit('ready');
    }

    async increment(desc: RateLimitDesc): Promise<boolean> {
        // Mock implementation
        console.log(`Incrementing rate limit: ${desc.toString()}`);
        return true;
    }

    async decrement(desc: RateLimitDesc): Promise<void> {
        // Mock implementation
        console.log(`Decrementing rate limit: ${desc.toString()}`);
    }

    async simpleRpcIPBasedLimit(
        rpcReflect: RPCReflection,
        ip: string,
        key: string[],
        rateLimit: (number | Date)[]
    ): Promise<ApiRoll> {
        // Mock implementation
        console.log(`Simple RPC IP based limit: ${ip}`);
        return new ApiRoll();
    }

    async simpleRPCUidBasedLimit(
        rpcReflect: RPCReflection,
        uid: string,
        key: string[],
        ...rateLimitPolicy: RateLimitDesc[]
    ): Promise<ApiRoll> {
        // Mock implementation
        console.log(`Simple RPC UID based limit: ${uid}`);
        return new ApiRoll();
    }
}

export class ApiRoll {
    chargeAmount: number;
    _ref?: {
        set: (...args: any[]) => Promise<void>;
    };

    constructor() {
        this.chargeAmount = 0;
    }

    async roll() {
        // Mock implementation
        return 'mock_roll';
    }
}
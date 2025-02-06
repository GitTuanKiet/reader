import { singleton } from 'tsyringe';
import { AsyncService } from 'civkit';

@singleton()
export class FirebaseRoundTripChecker extends AsyncService {
    private readonly roundtripMap: Map<string, number>;

    constructor() {
        super(...arguments);

        this.roundtripMap = new Map();
    }

    override async init() {
        await this.dependencyReady();

        this.emit('ready');
    }

    public async checkRoundtrip(key: string): Promise<boolean> {
        const lastRequest = this.roundtripMap.get(key) || 0;
        const now = Date.now();

        if (now - lastRequest < 5000) {
            return false;
        }

        this.roundtripMap.set(key, now);
        return true;
    }
}
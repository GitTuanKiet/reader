export class SecurityCompromiseError extends Error {
    constructor(params: { message: string; path?: string; } | string) {
        const message = typeof params === 'string' ? params : params.message;
        super(message);
        this.name = 'SecurityCompromiseError';
    }
}

export class ServiceCrashedError extends Error {
    constructor({ message }: { message: string; }) {
        super(message);
        this.name = 'ServiceCrashedError';
    }
}

export class ServiceNodeResourceDrainError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ServiceNodeResourceDrainError';
    }
}

export class InsufficientBalanceError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'InsufficientBalanceError';
    }
}

export class BudgetExceededError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'BudgetExceededError';
    }
}

export class ServiceBadAttemptError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ServiceBadAttemptError';
    }
}
export { AsyncContext } from './services/async-context';
export { Logger } from './services/logger';
export { FirebaseStorageBucketControl } from './services/firebase-storage-bucket';
export { TempFileManager } from './services/temp-file-manager';
export * from './lib/errors';

if (process.env.NODE_ENV === 'production') {
    if (!process.env.BASE_URL) {
        throw new Error('BASE_URL environment variable is required in production');
    }
}

export function getBaseUrl() {
    let baseUri;
    if (process.env.NODE_ENV === 'production') {
        baseUri = process.env.BASE_URL!;
    } else {
        baseUri = 'http://localhost:3000';
    }

    return baseUri.endsWith('/') ? baseUri.slice(0, -1) : baseUri;
}

export function CloudHTTPv2(config: any): MethodDecorator {
    return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
        // Simplified implementation
        console.log(`CloudHTTPv2 decorator applied to ${String(propertyKey)}`);
        return descriptor;
    };
}

export function CloudTaskV2(config: any): MethodDecorator {
    return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
        // Simplified implementation
        console.log(`CloudTaskV2 decorator applied to ${String(propertyKey)}`);
        return descriptor;
    };
}

export function Ctx() {
    return function (target: any, propertyKey: string, parameterIndex: number) {
        // Logic for extracting the context from request
        console.log(`Mapping context to method parameter at index ${parameterIndex}`);
    };
}

export class OutputServerEventStream {
    write(data: any) {
        console.log('OutputServerEventStream write:', data);
    }

    end() {
        console.log('OutputServerEventStream ended');
    }
}


export function Param(paramName: string, options?: { default?: any, validate?: (value: any) => boolean; }) {
    return function (target: any, propertyKey: string, parameterIndex: number) {
        const existingValidations = Reflect.getOwnMetadata('validations', target, propertyKey) || [];
        existingValidations.push({
            paramName,
            index: parameterIndex,
            validate: options?.validate,
            default: options?.default
        });
        Reflect.defineMetadata('validations', existingValidations, target, propertyKey);

        const originalMethod = target[propertyKey];
        target[propertyKey] = function (...args: any[]) {
            if (options?.validate && args[parameterIndex] !== undefined) {
                if (!options.validate(args[parameterIndex])) {
                    throw new Error(`Invalid value for parameter ${paramName}`);
                }
            }
            if (options?.default !== undefined && args[parameterIndex] === undefined) {
                args[parameterIndex] = options.default;
            }
            return originalMethod.apply(this, args);
        };
    };
}

export function RPCReflect() {
    return function (target: any, propertyKey: string | symbol, parameterIndex: number) {
        console.log(`RPCReflect decorator applied to parameter ${parameterIndex} of ${String(propertyKey)}`);
    };
}

// import { readdirSync } from 'fs';
export const loadModulesDynamically = (dirPath: string) => {
    console.log(`Loading modules dynamically from ${dirPath}`);
    // const files = readdirSync(dirPath);
    // for (const file of files) {
    //     require(`${dirPath}/${file}`);
    // }
};

export const registry = {
    title: 'Registry',
    version: '1.0.0',
    exportAll: () => {
        console.log(`Exporting all modules...`);
    },
    exportGrouped: (option: Record<string, any>) => {
        console.log(`Exporting grouped modules...`, JSON.stringify(option));
    },
    allHandsOnDeck: async () => {
        console.log(`All hands on deck...`);
    }
};

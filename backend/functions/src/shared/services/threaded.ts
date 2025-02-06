export function Threaded() {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            return Promise.resolve().then(() => originalMethod.apply(this, args));
        };

        return descriptor;
    };
}

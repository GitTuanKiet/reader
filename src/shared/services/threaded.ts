// import { Worker } from 'worker_threads';
// import { marshalErrorLike } from 'civkit';

// export function Threaded() {
//     return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
//         const originalMethod = descriptor.value;

//         descriptor.value = function (...args: any[]) {
//             try {
//                 // Currently not implementing actual threading, just execute in main thread
//                 return originalMethod.apply(this, args);
//             } catch (error) {
//                 throw error;
//             }
//         };

//         return descriptor;
//     };
// }

export { Threaded } from '../../services/threaded';
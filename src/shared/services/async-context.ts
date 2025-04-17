import { singleton } from 'tsyringe';
import { AsyncLocalContext } from '../../services/async-context';

@singleton()
export class AsyncContext extends AsyncLocalContext { }

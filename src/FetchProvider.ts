import { FetchError } from 'node-fetch';
import BaseConnection from './BaseConnection';
import { Provider, RequestArguments, ResolutionMethod } from './types';
import ResolutionError, { ResolutionErrorCode } from './errors/resolutionError';

/** @internal */
export default class FetchProvider extends BaseConnection implements Provider {
  readonly url: string;
  readonly name: ResolutionMethod;

  constructor(name: ResolutionMethod, url: string) {
    super();
    this.url = url;
    this.name = name;
  }

  async request(args: RequestArguments): Promise<unknown> {
    try {
      const options = {
        method: 'POST',
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: '1',
          method: args.method,
          params: args.params || [],
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      };
      console.log(this.url, options)
      const response = await this.fetch(this.url, options);
      const json = await response.json();
      return json.result;
    } catch (error) {
      console.log(">>HERE -------------", error, this.url)
      if (error instanceof FetchError) {
        throw new ResolutionError(ResolutionErrorCode.NamingServiceDown, {
          method: this.name,
        });
      } else throw error;
    }
  }
}

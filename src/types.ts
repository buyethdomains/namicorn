export type Dictionary<T> = { [k: string]: T };

/**
 * SourceDefinition object
 * @typedef {Object} SourceDefinition
 * @property {string} [url] - main blockchain api url
 * @property {string | number} [network] - blockchain network
 */
export interface SourceDefinition {
  enabled?: boolean;
  url?: string;
  network?: string | number;
  registry?: string;
  provider?: Provider;
}


/**
 * NamingServiceSource
 * just an alias
 * @typedef {string | boolean | SourceDefinition}
 */
export type NamingServiceSource = string | boolean | SourceDefinition;

export enum NamingServiceName {
  ENS = 'ENS',
  CNS = 'CNS',
  ZNS = 'ZNS',
}

export type ResolutionMethod = NamingServiceName | 'UDAPI';

/** @internal */
export type EnsNetworkIdMap = {
  [key: number]: string;
};

/** @internal */
export interface BlockhanNetworkUrlMap {
  [key: string]: string;
}

/** @internal */
export interface RegistryMap {
  [key: string]: string;
}

/**
 * ResolutionResulution
 * @typedef ResolutionResponse
 * @property {Object} addresses - Resolution addresses for various currency addresses attached to the domain
 * @property {Object} meta - meta information about the owner of the domain
 */
export type ResolutionResponse = {
  ipfs?: {
    html?: string;
    redirect_domain?: string;
  };
  whois?: {
    email?: string;
    for_sale?: boolean;
  };
  gundb?: {
    username?: string;
    public_key?: string;
  },
  addresses: {
    [key: string]: string;
  };
  meta: {
    owner: string | null;
    type: string; //available domain
    ttl: number;
  };
};

/** @internal */
export type NetworkIdMap = {
  [key: number]: string;
};

export const UDApiDefaultUrl = 'https://unstoppabledomains.com/api/v1';

/**
 * Main configurational object for Resolution instance
 */
export type Blockchain = {
  ens?: NamingServiceSource;
  zns?: NamingServiceSource;
  cns?: NamingServiceSource;
  web3Provider?: Provider;
};

export type API = {
  url: string;
};

export type ProviderParams = unknown[] | object;

export interface RequestArguments {
  method: string;
  params?: ProviderParams;
}

/**
 * @see https://eips.ethereum.org/EIPS/eip-1193
 */
export interface Provider {
  request: (request: RequestArguments) => Promise<unknown>;
}

/**
 * @deprecated
 */
export type Web3Provider = Provider;

/**
 * @see https://github.com/ethereum/web3.js/blob/1.x/packages/web3-core-helpers/types/index.d.ts#L216
 */
export interface JsonRpcPayload {
  jsonrpc: string;
  method: string;
  params: any[];
  id?: string | number;
}

export interface JsonRpcResponse {
  jsonrpc: string;
  id: number;
  result?: any;
  error?: string;
}

type ProviderMethod = (
  payload: JsonRpcPayload,
  callback: (error: Error | null, result?: JsonRpcResponse) => void,
) => void;

export interface Web3Version0Provider {
  sendAsync: ProviderMethod;
}

export interface Web3Version1Provider {
  send: ProviderMethod;
}

export const DefaultAPI: API = {
  url: UDApiDefaultUrl,
};

/**
 * Default structure of ZnsResolution records
 * @typedef {object} ZnsResolution
 */
export type ZnsResolution = {
  crypto?: Dictionary<{ address?: string; [key: string]: any }>;
  ttl?: string;
  [key: string]: any;
};

export type Bip44Constants = [number, string, string];
export type owner = string;
export type ttl = string;
export type nodeHash = string;
/** @internal */
export enum NullAddress {
  '0x',
  '0x0000000000000000000000000000000000000000',
  '0x0000000000000000000000000000000000000000000000000000000000000000',
}

export function isNullAddress(key: string | null): boolean {
  if (!key) return true;
  return Object.values(NullAddress).includes(key);
}

export const EthCoinIndex = 60;

export const UnclaimedDomainResponse: ResolutionResponse = {
  addresses: {},
  meta: {
    owner: null, //available domain
    type: '',
    ttl: 0,
  },
};

/**
 * @deprecated Use UnclaimedDomainResponse instead (deprecated since 0.3.4)
 */
export const UNCLAIMED_DOMAIN_RESPONSE = UnclaimedDomainResponse;

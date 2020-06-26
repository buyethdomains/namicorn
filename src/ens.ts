import { default as ensInterface } from './ens/contract/ens';
import { default as resolverInterface } from './ens/contract/resolver';
import { default as hash, childhash } from './ens/namehash';
import { formatsByCoinType } from '@ensdomains/address-encoder';
import {
  ResolutionResponse,
  EthCoinIndex,
  NamingServiceSource,
  NamingServiceName,
  Bip44Constants,
  isNullAddress,
  nodeHash,
  Provider,
} from './types';
import { EthereumNamingService } from './namingService';
import { ResolutionError, ResolutionErrorCode } from './index';
import Contract from './utils/contract';
import contentHash from 'content-hash';
import EnsNetworkMap from 'ethereum-ens-network-map';
import ConfigurationError, {
  ConfigurationErrorCode,
} from './errors/configurationError';

/** @internal */
export default class Ens extends EthereumNamingService {
  readonly name = NamingServiceName.ENS;
  readonly network: string;
  readonly url: string;
  readonly registryAddress?: string;
  /**
   * Source object describing the network naming service operates on
   * @param source - if specified as a string will be used as main url, if omited then defaults are used
   * @param provider - EthersJS provider, an object that implemented sendAsync(method, params) functionality
   * @throws ConfigurationError - when either network or url is setup incorrectly
   */
  constructor(source: NamingServiceSource = true, provider?: Provider) {
    super(provider);
    source = this.normalizeSource(source);
    this.network = <string>source.network;
    this.url = source.url as string;
    if (!this.network) {
      throw new ConfigurationError(ConfigurationErrorCode.UnspecifiedNetwork, {
        method: NamingServiceName.ENS,
      });
    }
    if (!this.url) {
      throw new ConfigurationError(ConfigurationErrorCode.UnspecifiedUrl, {
        method: NamingServiceName.ENS,
      });
    }
    this.registryAddress = source.registry
      ? source.registry
      : EnsNetworkMap[this.NetworkNameMap[this.network]];
    if (this.registryAddress) {
      this.registryContract = this.buildContract(
        ensInterface,
        this.registryAddress,
      );
    }
  }

  /**
   * Checks if the domain is in valid format
   * @param domain - domain name to be checked
   */
  isSupportedDomain(domain: string): boolean {
    return (
      domain === 'eth' ||
      (domain.indexOf('.') > 0 &&
        /^[^-]*[^-]*\.(eth|luxe|xyz|kred)$/.test(domain) &&
        domain.split('.').every(v => !!v.length))
    );
  }

  /**
   * Checks if the current network is supported
   */
  isSupportedNetwork(): boolean {
    return this.registryAddress != null;
  }

  /** @internal */
  record(domain: string, key: string): Promise<string> {
    throw new Error('Method not implemented.');
  }

  /**
   * Reverse the ens address to a ens registered domain name
   * @async
   * @param address - address you wish to reverse
   * @param currencyTicker - currency ticker like BTC, ETH, ZIL
   * @returns Domain name attached to this address
   */
  async reverse(
    address: string,
    currencyTicker: string,
  ): Promise<string | null> {
    if (currencyTicker != 'ETH') {
      throw new Error(`Ens doesn't support any currency other than ETH`);
    }
    if (address.startsWith('0x')) {
      address = address.substr(2);
    }
    const reverseAddress = address + '.addr.reverse';
    const nodeHash = hash(reverseAddress);
    const resolverAddress = await this.getResolver(nodeHash);
    if (isNullAddress(resolverAddress)) {
      return null;
    }
    const resolverContract = this.buildContract(
      resolverInterface(resolverAddress, EthCoinIndex),
      resolverAddress,
    );

    return await this.resolverCallToName(resolverContract, nodeHash);
  }

  /**
   * Resolves domain to a specific cryptoAddress
   * @param domain - domain name to be resolved
   * @param currencyTicker - specific currency ticker such as
   *  - ZIL
   *  - BTC
   *  - ETH
   * @returns A promise that resolves in a string
   * @throws ResolutionError
   */
  async address(domain: string, currencyTicker: string): Promise<string> {
    const nodeHash = this.namehash(domain);
    const resolver = await this.resolver(domain);
    const coinType = this.getCoinType(currencyTicker.toUpperCase());

    var addr = await this.fetchAddressOrThrow(resolver, nodeHash, coinType);
    if (!addr)
      throw new ResolutionError(ResolutionErrorCode.UnspecifiedCurrency, {
        domain,
        currencyTicker,
      });
    return addr;
  }

  /**
   * Owner of the domain
   * @param domain - domain name
   * @returns An owner address of the domain
   */
  async owner(domain: string): Promise<string | null> {
    const nodeHash = this.namehash(domain);
    return (
      (await this.ignoreResolutionError(
        ResolutionErrorCode.RecordNotFound,
        this.getOwner(nodeHash),
      )) || null
    );
  }

  /**
   * Resolves the given domain
   * @async
   * @param domain - domain name to be resolved
   * @returns A promise that resolves in an object
   */
  async resolve(domain: string): Promise<ResolutionResponse | null> {
    if (!this.isSupportedDomain(domain) || !this.isSupportedNetwork()) {
      return null;
    }
    const nodeHash = this.namehash(domain);
    var [owner, ttl, resolver] = await this.getResolutionInfo(domain);
    if (isNullAddress(owner)) owner = null;
    const address = await this.fetchAddress(resolver, nodeHash, EthCoinIndex);
    const resolution = {
      meta: {
        owner,
        type: this.name,
        ttl: Number(ttl),
      },
      addresses: {},
    };
    if (address) resolution.addresses = { ETH: address };
    return resolution;
  }

  /**
   * resolves an ipfsHash stored on domain
   * @param domain - domain name
   */
  async ipfsHash(domain: string): Promise<string> {
    const hash = await this.getContentHash(domain);
    return this.ensureRecordPresence(domain, 'IPFS hash', hash)
  }

  /**
   * resolves a httpUrl stored on domain
   * @param domain - domain name
   */
  async httpUrl(domain: string): Promise<string> {
    const resolver = await this.getResolverContract(domain);
    const httpUrl = await this.getTextRecord(resolver, domain, 'url');
    return httpUrl;
  }
  /**
   * resolves an email stored on domain
   * @param domain - domain name
   */
  async email(domain: string): Promise<string> {
    const resolver = await this.getResolverContract(domain);
    const email = await this.getTextRecord(resolver, domain, 'email');
    return email;
  }

  async chatId(domain: string): Promise<string> {
    throw new Error('Method is not implemented');
  }

  /**
   * Produces ENS namehash
   * @param domain - domain to be hashed
   * @returns ENS namehash of a domain
   */
  namehash(domain: string): nodeHash {
    this.ensureSupportedDomain(domain);
    return hash(domain);
  }

  private async getContentHash(domain: string): Promise<string | undefined> {
    const nodeHash = this.namehash(domain);
    const resolverContract = await this.getResolverContract(domain);
    const contentHashEncoded = await this.callMethod(
      resolverContract,
      'contenthash',
      [nodeHash],
    );
    const codec = contentHash.getCodec(contentHashEncoded);
    if (codec !== 'ipfs-ns') return undefined;
    return contentHash.decode(contentHashEncoded);
  }

  private async getTextRecord(resolver: Contract, domain, key) {
    const nodeHash = this.namehash(domain);
    const record = await this.callMethod(resolver, 'text', [nodeHash, key]);
    return this.ensureRecordPresence(domain, key, record);
  }

  private async getResolverContract(domain: string): Promise<Contract> {
    const resolverAddress = await this.resolver(domain);
    return this.buildContract(
      resolverInterface(resolverAddress),
      resolverAddress,
    );
  }

  /**
   * Returns the childhash
   * @param parent - nodehash of a parent
   * @param label - child
   */
  childhash(
    parent: nodeHash,
    label: string,
    options: { prefix: boolean } = { prefix: true },
  ): nodeHash {
    return childhash(parent, label, options);
  }

  /**
   * This was done to make automated tests more configurable
   */
  private resolverCallToName(resolverContract: Contract, nodeHash) {
    return this.callMethod(resolverContract, 'name', [nodeHash]);
  }

  private async getTTL(nodeHash) {
    return await this.ignoreResolutionError(
      ResolutionErrorCode.RecordNotFound,
      this.callMethod(this.registryContract, 'ttl', [nodeHash]),
    );
  }

  /**
   * This was done to make automated tests more configurable
   */
  protected async getResolver(nodeHash) {
    return await this.ignoreResolutionError(
      ResolutionErrorCode.RecordNotFound,
      this.callMethod(this.registryContract, 'resolver', [nodeHash]),
    );
  }

  /**
   * This was done to make automated tests more configurable
   */
  private async getOwner(nodeHash) {
    return await this.callMethod(this.registryContract, 'owner', [nodeHash]);
  }

  /**
   * This was done to make automated tests more configurable
   */
  private async getResolutionInfo(domain: string) {
    const nodeHash = this.namehash(domain);
    return await Promise.all([
      this.owner(domain),
      this.getTTL(nodeHash),
      this.getResolver(nodeHash),
    ]);
  }

  /** @internal */
  protected getCoinType(currencyTicker: string): number {
    const constants: Bip44Constants[] = require('bip44-constants');
    const coin = constants.findIndex(
      item =>
        item[1] === currencyTicker.toUpperCase() ||
        item[2] === currencyTicker.toUpperCase(),
    );
    if (coin < 0 || !formatsByCoinType[coin])
      throw new ResolutionError(ResolutionErrorCode.UnsupportedCurrency, {
        currencyTicker,
      });
    return coin;
  }

  private async fetchAddressOrThrow(resolver, nodeHash, coinType: number) {
    if (!resolver || isNullAddress(resolver)) {
      return null;
    }
    const resolverContract = this.buildContract(
      resolverInterface(resolver, coinType),
      resolver,
    );
    const addr: string =
      coinType != EthCoinIndex
        ? await this.callMethod(resolverContract, 'addr', [nodeHash, coinType])
        : await this.callMethod(resolverContract, 'addr', [nodeHash]);
    if (!addr || addr === '0x') return null;
    const data = Buffer.from(addr.replace('0x', ''), 'hex');
    return formatsByCoinType[coinType].encoder(data);
  }

  private async fetchAddress(resolver, nodeHash, coin = EthCoinIndex) {
    return (
      (await this.ignoreResolutionError(
        ResolutionErrorCode.RecordNotFound,
        this.fetchAddressOrThrow(resolver, nodeHash, coin),
      )) || null
    );
  }
}

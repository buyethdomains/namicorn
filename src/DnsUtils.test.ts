import DnsUtils from "./DnsUtils";
import DnsRecordsError, { DnsRecordsErrorCode } from "./errors/dnsRecordsError";
import { CryptoRecords, DnsRecord, DnsRecordType } from "./publicTypes";
import { expectDnsRecordErrorCode } from "./tests/helpers";

let dnsUtils: DnsUtils;
beforeAll(() => {
  dnsUtils = new DnsUtils();
});

describe('DnsUtils', () => {
  describe('toList', () => {
    it('should work', () => {
      const record: CryptoRecords = {
        "dns.ttl": "128",
        "dns.A": '["10.0.0.1","10.0.0.2"]',
        "dns.A.ttl": "90",
        "dns.AAAA": '["10.0.0.120"]'
      };
      const classic: DnsRecord[] = dnsUtils.toList(record);
      expect(classic).toStrictEqual([
        { TTL: 90, data: '10.0.0.1', type: 'A' },
        { TTL: 90, data: '10.0.0.2', type: 'A' },
        { TTL: 128, data: '10.0.0.120', type: 'AAAA' }
      ]);
    });
  
    it('dns.A = [] ', () => {
      const record: CryptoRecords = {
        "dns.ttl": "128",
        "dns.A": '[]',
        "dns.A.ttl": "90",
        "dns.AAAA": '["10.0.0.120"]'
      };
      const classic: DnsRecord[] = dnsUtils.toList(record);
      expect(classic).toStrictEqual([
        { TTL: 128, data: '10.0.0.120', type: 'AAAA' }
      ]); 
    });

    it('dns.A with invalid json', () => {
      const record: CryptoRecords = {
        "dns.ttl": "128",
        "dns.A": '[',
        "dns.A.ttl": "90",
        "dns.AAAA": '["10.0.0.120"]'
      };
      expectDnsRecordErrorCode(() => dnsUtils.toList(record), DnsRecordsErrorCode.DnsRecordCorrupted);
    });

    it('dns.ttl is not a number',() => {
      const record: CryptoRecords = {
        "dns.ttl": "bh",
        "dns.A": '[',
        "dns.A.ttl": "90",
        "dns.AAAA": '["10.0.0.120"]'
      };
      expectDnsRecordErrorCode(() => dnsUtils.toList(record), DnsRecordsErrorCode.DnsRecordCorrupted);
    });

  });

  describe('toCrypto', () => {
    it('should work', () => {
      const classicalRecords: DnsRecord[] =[
        { TTL: 90, data: '10.0.0.1', type: 'A' as DnsRecordType },
        { TTL: 90, data: '10.0.0.2', type: 'A' as DnsRecordType },
        { TTL: 128, data: '10.0.0.120', type: 'AAAA' as DnsRecordType }
      ]; 
      const cryptoRecords: CryptoRecords = dnsUtils.toCrypto(classicalRecords);
      expect(cryptoRecords).toStrictEqual({
        'dns.A': "[\"10.0.0.1\",\"10.0.0.2\"]",
        'dns.A.ttl': "90",
        'dns.AAAA': "[\"10.0.0.120\"]",
        'dns.AAAA.ttl': "128"
      });
    });
  
    it('toCrypto with wrong ttl', () => {
      const classicalRecords: DnsRecord[] = [
        { TTL: 90, data: '10.0.0.20', type: 'A' as DnsRecordType },
        { TTL: 900, data: '10.0.0.20', type: 'A' as DnsRecordType }
      ];
      expectDnsRecordErrorCode(() => dnsUtils.toCrypto(classicalRecords), DnsRecordsErrorCode.InconsistentTtl);
    });

  });

});
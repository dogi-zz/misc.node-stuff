import {Base64, HmacSha256, Sha256} from "./crypt";

describe('crypt.ts', () => {

  beforeEach(async () => {

  });



  it('Base64', async () => {

    const base64 = new Base64();

    expect(base64.encode('hello world')).toEqual('aGVsbG8gd29ybGQ=');
    expect(base64.encode('Polyfon zwitschernd aßen Mäxchens Vögel Rüben, Joghurt und Quark')).toEqual('UG9seWZvbiB6d2l0c2NoZXJuZCBhw59lbiBNw6R4Y2hlbnMgVsO2Z2VsIFLDvGJlbiwgSm9naHVydCB1bmQgUXVhcms=');
    expect(base64.encode('Franz jagt im Komplett verwahrlosten Taxi quer durh Bayern')).toEqual('RnJhbnogamFndCBpbSBLb21wbGV0dCB2ZXJ3YWhybG9zdGVuIFRheGkgcXVlciBkdXJoIEJheWVybg==');
    expect(base64.encode('Franz jagt im Komplett verwahrlosten Taxi quer durh Bayern!!')).toEqual('RnJhbnogamFndCBpbSBLb21wbGV0dCB2ZXJ3YWhybG9zdGVuIFRheGkgcXVlciBkdXJoIEJheWVybiEh');

  });

  it('Sha256', async () => {
    const sha256 = new Sha256();

    expect(sha256.generate('hello world', {seperatedBlocks: true})).toEqual('b94d27b9 934d3e08 a52e52d7 da7dabfa c484efe3 7a5380ee 9088f7ac e2efcde9',);
    expect(sha256.generate('abc', {seperatedBlocks: true})).toEqual('ba7816bf 8f01cfea 414140de 5dae2223 b00361a3 96177a9c b410ff61 f20015ad',);
    expect(sha256.generate('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq', {seperatedBlocks: true})).toEqual('248d6a61 d20638b8 e5c02693 0c3e6039 a33ce459 64ff2167 f6ecedd4 19db06c1',);
  });

  it('HmacSha256', async () => {
    const hmacSha256 = new HmacSha256();

    expect(hmacSha256.generate('hello world', 'geheim')).toEqual('b69fef3e3fe467e1fcc7353673fd120dccbf41c82dc61c564a212363cee0f122');
  });

});

// https://de.wikipedia.org/wiki/Base64#:~:text=Base64%20ist%20ein%20Verfahren%20zur,%2Dunabh%C3%A4ngigen%20ASCII%2DZeichen%20besteht.
// https://de.wikipedia.org/wiki/HMAC
// https://blog.boot.dev/cryptography/how-sha-2-works-step-by-step-sha-256/

const DEV = false;

const utf8ToBytes = (inputString: string) => [...new TextEncoder().encode(inputString)];
const bytesToUtf8 = (inputBytes: number[]) => new TextDecoder().decode(new Uint8Array(inputBytes));


const pad6 = (str: number | string) => typeof str === 'number' ? pad6(str.toString(2)) : (str.length < 6) ? pad6(`0${str}`) : str;
const pad8 = (str: number | string) => typeof str === 'number' ? pad8(str.toString(2)) : (str.length < 8) ? pad8(`0${str}`) : str;
const pad32 = (str: number | string) => typeof str === 'number' ? pad32(str.toString(2)) : (str.length < 32) ? pad32(`0${str}`) : str;
const pad64 = (str: number | string) => typeof str === 'number' ? pad64(str.toString(2)) : (str.length < 64) ? pad64(`0${str}`) : str;

const byteHex = (str: number | string) => typeof str === 'number' ? byteHex(str.toString(16)) : (str.length < 2) ? `0${str}` : str;

const shiftNums = [1];
for (let i = 1; i <= 32; i++) {
  shiftNums.push(shiftNums[shiftNums.length - 1] * 2);
}
const rightShift32 = (input: number, amount: number) => {
  return Math.floor(input / shiftNums[amount]);
};
const leftShift32 = (input: number, amount: number) => {
  return input * shiftNums[amount];
};
const rightRotate32 = (input: number, amount: number) => {
  return rightShift32(input, amount) + leftShift32(input % shiftNums[amount], 32 - amount);
};
const xor32 = (a: number, b: number) => {
  const [aString, bString] = [pad32(a).split(''), pad32(b).split('')];
  return parseInt(aString.map((a, i) => a !== bString[i] ? '1' : '0').join(''), 2);
};
const and32 = (a: number, b: number) => {
  const [aString, bString] = [pad32(a).split(''), pad32(b).split('')];
  return parseInt(aString.map((a, i) => a === '1' && bString[i] === '1' ? '1' : '0').join(''), 2);
};
const not32 = (a: number) => {
  return parseInt(pad32(a).split('').map((a) => a === '1' ? '0' : '1').join(''), 2);
};

const xor512 = (a: number[], b: number[]) => {
  const resultBytes: number[] = [];
  for (let i = 0; i < 64; i++) {
    const [aString, bString] = [pad8(a[i]).split(''), pad8(b[i]).split('')];
    resultBytes.push(parseInt(aString.map((a, i) => a !== bString[i] ? '1' : '0').join(''), 2));
  }
  return resultBytes;
};


class BitVector {

  private static bitNums = [128, 64, 32, 16, 8, 4, 2, 1];

  public data: number[];
  private tail: { num: number, len: number } = null;

  public length: number;

  constructor(bytes: number[]) {
    this.data = [];
    if (bytes) {
      for (let i = 0; i < bytes.length; i++) {
        this.data[i] = bytes[i];
      }
      this.length = this.data.length * 8;
    }
  }

  public clone() {
    const result = new BitVector(null);
    result.data = [...this.data];
    result.tail = this.tail ? {num: this.tail.num, len: this.tail.len} : null;
    result.length = this.length;
    return result;
  }

  public addBits(...bits: (0 | 1)[]) {
    bits.forEach(bit => {
      if (!this.tail) {
        this.tail = {num: 0, len: 0};
      }
      this.tail.num += bit ? BitVector.bitNums[this.tail.len] : 0;
      this.tail.len++;
      this.length++;
      if (this.tail.len === 8) {
        this.data.push(this.tail.num);
        this.tail = null;
      }
    });
  }

  public addBitString(bitString: string) {
    return this.addBits(...bitString.split('').map(c => c === '0' ? 0 : 1));
  }

  public addByte(byte: number) {
    if (this.tail) {
      throw new Error('not implemented');
    }
    this.data.push(byte);
    this.length += 8;
  }

  public print() {
    const stringData = this.data.map(num => pad8(num));
    if (this.tail) {
      stringData.push(pad8(this.tail.num).substring(0, this.tail.len));
    }
    for (let i = 0; i < stringData.length; i += 8) {
      console.info(stringData.slice(i, i + 8).join(' '));
    }
  }

}

class WordVector {

  public data: number[];

  constructor(bits: number[]) {
    if (bits.length % 4) {
      throw new Error('Illegal BitVector length');
    }
    this.data = [];
    for (let i = 0; i < bits.length; i += 4) {
      let num = 0;
      for (let j = 0; j < 4; j++) {
        num = num * 256 + bits[i + j];
      }
      this.data.push(num);
    }
  }

  public print() {
    const stringData = this.data.map(num => pad32(num));
    console.info('-------------------------------- --------------------------------');
    for (let i = 0; i < stringData.length; i += 2) {
      console.info(stringData.slice(i, i + 2).join(' '));
    }
    console.info('-------------------------------- --------------------------------');
  }

}



export class Base64 {


  public static alphabetBase = [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    '+', '/',
  ];
  public static alphabetUrl = [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    '-', '_',
  ];
  public static alphabetMap = {};

  constructor() {
  }

  public encodeBytes(data: number[], options?: { noPadding?: boolean, url?: boolean }) {
    const dataToEncode = [...data];
    const alphabet = options?.url ? Base64.alphabetUrl : Base64.alphabetBase;
    let padding = 0;
    while (dataToEncode.length % 3) {
      padding++;
      dataToEncode.push(0);
    }

    const blocks: string[] = [];
    for (let i = 0; i < dataToEncode.length; i += 3) {
      blocks.push(`${pad8(dataToEncode[i].toString(2))}${pad8(dataToEncode[i + 1].toString(2))}${pad8(dataToEncode[i + 2].toString(2))}`);
    }
    const outputChars: string[] = [];
    blocks.forEach(block => {
      for (let i = 0; i < block.length; i += 6) {
        const letter = block.substring(i, i + 6);
        outputChars.push(alphabet[parseInt(letter, 2)]);
      }
    });
    for (let i = 1; i <= padding; i++) {
      outputChars[outputChars.length - i] = '=';
    }
    if (padding && (options?.noPadding || options?.url)) {
      outputChars.splice(outputChars.length - padding);
    }
    return outputChars.join('');
  }

  public encode(inputString: string, options?: { noPadding?: boolean, url?: boolean }) {
    return this.encodeBytes(utf8ToBytes(inputString), options);
  }

  public decode(base64Code: string) {
    const decodesChars: number[] = [];
    const decodesBytes: number[] = [];
    const decode = () => {
      const bits = decodesChars.map(char => pad6(char)).join('');
      for (let i = 0; i < bits.length; i += 8) {
        decodesBytes.push(parseInt(bits.substring(i, i + 8), 2));
      }
    };
    const charactersToDecode = base64Code.split('').filter(char => char !== '=');
    let padding = 0;
    while ((charactersToDecode.length + padding) % 4) {
      padding++;
    }
    charactersToDecode.forEach(char => {
      if (decodesChars.length === 4) {
        decode();
        decodesChars.splice(0);
      }
      decodesChars.push(Base64.alphabetMap[char]);
    });
    decode();
    if (padding) {
      decodesBytes.pop();
    }
    return bytesToUtf8(decodesBytes);
  }
}

Base64.alphabetBase.forEach((char, idx) => Base64.alphabetMap[char] = idx);
Base64.alphabetMap['-'] = Base64.alphabetMap['+'];
Base64.alphabetMap[`_`] = Base64.alphabetMap['/'];




export class Sha256 {

  private static h0 = [
    0x6a09e667,
    0xbb67ae85,
    0x3c6ef372,
    0xa54ff53a,
    0x510e527f,
    0x9b05688c,
    0x1f83d9ab,
    0x5be0cd19,
  ];
  private static k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];


  constructor() {
  }

  public generateFromBytes(inputBytes: number[], options?: { asWords?: boolean }): number[] {
    const inputVector = new BitVector(inputBytes);
    const inputVectorModified = inputVector.clone();
    inputVectorModified.addBits(1);
    while (inputVectorModified.length <= 64 || (inputVectorModified.length + 64) % 512 !== 0) {
      inputVectorModified.addBits(0);
    }
    inputVectorModified.addBitString(pad64(inputVector.length));

    const hAll = [...Sha256.h0];

    for (let chunk = 0; chunk < inputVectorModified.data.length; chunk += 64) {
      const messageSchedule = new WordVector(inputVectorModified.data.slice(chunk, chunk + 64));
      while (messageSchedule.data.length < 64) {
        messageSchedule.data.push(0);
      }
      for (let i = 16; i < 64; i++) {
        const w01 = rightRotate32(messageSchedule.data[i - 15], 7);
        const w02 = rightRotate32(messageSchedule.data[i - 15], 18);
        const w03 = rightShift32(messageSchedule.data[i - 15], 3);
        const s0 = xor32(w01, xor32(w02, w03));
        const w11 = rightRotate32(messageSchedule.data[i - 2], 17);
        const w12 = rightRotate32(messageSchedule.data[i - 2], 19);
        const w13 = rightShift32(messageSchedule.data[i - 2], 10);
        const s1 = xor32(w11, xor32(w12, w13));
        messageSchedule.data[i] = (messageSchedule.data[i - 16] + s0 + messageSchedule.data[i - 7] + s1) % shiftNums[32];
      }

      const hChunk = [...hAll]; // [0:a, 1:b, 2:c, 3:d, 4:e, 5:f, 6:g, 7:h]
      for (let i = 0; i < 64; i++) {
        const s1 = xor32(rightRotate32(hChunk[4], 6), xor32(rightRotate32(hChunk[4], 11), rightRotate32(hChunk[4], 25)));
        const ch = xor32(and32(hChunk[4], hChunk[5]), and32(not32(hChunk[4]), hChunk[6]));
        const temp1 = (hChunk[7] + s1 + ch + Sha256.k[i] + messageSchedule.data[i]) % shiftNums[32];
        const s0 = xor32(rightRotate32(hChunk[0], 2), xor32(rightRotate32(hChunk[0], 13), rightRotate32(hChunk[0], 22)));
        const maj = xor32(and32(hChunk[0], hChunk[1]), xor32(and32(hChunk[0], hChunk[2]), and32(hChunk[1], hChunk[2])));
        const temp2 = (s0 + maj) % shiftNums[32];

        hChunk.unshift((temp1 + temp2) % shiftNums[32]);
        hChunk.pop();
        hChunk[4] = (hChunk[4] + temp1) % shiftNums[32];
      }
      for (let i = 0; i < 8; i++) {
        hAll[i] = (hAll[i] + hChunk[i]) % shiftNums[32];
      }
    }
    if (options?.asWords) {
      return hAll;
    } else {
      const result: number[] = [];
      hAll.forEach(word => {
        const wordString = pad8(word.toString(16));
        for (let i = 0; i < 4; i++) {
          result.push(parseInt(wordString.substring(i * 2, i * 2 + 2), 16));
        }
      });
      return result;
    }
  }

  public generate(inputString: string, options?: { seperatedBlocks?: boolean }) {
    const hAll = this.generateFromBytes(utf8ToBytes(inputString), {asWords: true});
    return hAll.map(p => pad8(p.toString(16))).join(options?.seperatedBlocks ? ' ' : '');
  }
}


export class Hmac {

  public static oPad: number[] = [];
  public static iPad: number[] = [];


  constructor(private hashFunction: (input: number[]) => number[]) {
  }

  public generateBytes(inputString: string, secret: string) {
    if (!secret){
      throw new Error('no secret for Hmac');
    }
    const inputBytes = utf8ToBytes(inputString);
    let secretBytes = utf8ToBytes(secret);

    if (secretBytes.length > 512) {
      secretBytes = this.hashFunction(utf8ToBytes(secret));
    }

    const secretVector = new BitVector(secretBytes);
    while (secretVector.length < 512) {
      secretVector.addByte(0);
    }

    const kIPad = xor512(secretVector.data, Hmac.iPad);
    const koPad = xor512(secretVector.data, Hmac.oPad);
    return this.hashFunction([...koPad, ...this.hashFunction([...kIPad, ...inputBytes])]);
  }
  public generate(inputString: string, secret: string) {
    return this.generateBytes(inputString, secret).map(num => byteHex(num)).join('');
  }
}

for (let i = 0; i < 512; i++) {
  Hmac.oPad.push(0x5c);
  Hmac.iPad.push(0x36);
}


export class HmacSha256 extends Hmac {

  constructor() {
    super(inputBytes => new Sha256().generateFromBytes(inputBytes));
  }

}




export class JWT {
  public createToken(payload: any, secret: string, expiration?: Date | string) {
    const base64 = new Base64();
    const hmacSha256 = new HmacSha256();

    let expirationDate: Date;
    if (typeof expiration === 'string') {
      expirationDate = new Date();
      const checkUnit = (unit: string, callback: (amount: number) => void) => {
        if (expiration.endsWith(unit)) {
          callback(parseInt(expiration.substring(0, expiration.length - unit.length), 10));
          return true;
        }
        return false;
      };
      if (!checkUnit('ms', (amount) => expirationDate.setMilliseconds(expirationDate.getMilliseconds() + amount))
          && !checkUnit('s', (amount) => expirationDate.setSeconds(expirationDate.getSeconds() + amount))
          && !checkUnit('m', (amount) => expirationDate.setMinutes(expirationDate.getMinutes() + amount))
          && !checkUnit('h', (amount) => expirationDate.setHours(expirationDate.getHours() + amount))
          && !checkUnit('d', (amount) => expirationDate.setDate(expirationDate.getDate() + amount))) {
        throw new Error(`expiration time not parseable: ${expiration}`);
      }
    } else {
      expirationDate = expiration;
    }
    const iat = payload.iat || Math.floor(new Date().getTime() / 1000);
    const exp = payload.exp || Math.ceil(expirationDate.getTime() / 1000);
    if (!payload.exp || !exp) {
      throw new Error(`expiration time missing`);
    }
    const header = {
      'alg': 'HS256',
      'typ': 'JWT',
    };
    const encodedHeader = base64.encode(JSON.stringify(header), {url: true});
    const encodedPayload = base64.encode(JSON.stringify({...payload, iat, exp}), {url: true});
    const encodedString = `${encodedHeader}.${encodedPayload}`;
    const hash = hmacSha256.generateBytes(encodedString, secret);
    const secretSign = base64.encodeBytes(hash, {url: true});
    return `${encodedHeader}.${encodedPayload}.${secretSign}`;
  }

  public decodeToken(token: string, secret?: string): { header: any, payload: any, error: {expired: boolean, invalid: boolean} } {
    const base64 = new Base64();
    const hmacSha256 = new HmacSha256();

    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('invalid Token');
    }
    const header = JSON.parse(base64.decode(parts[0]));
    const payload = JSON.parse(base64.decode(parts[1]));
    const now = new Date().getTime() / 1000;
    const expired = !payload.iat || !payload.exp || payload.iat > now || payload.exp  < now;

    const encodedString = `${parts[0]}.${parts[1]}`;
    const hash = secret ? hmacSha256.generateBytes(encodedString, secret) : null;
    const secretSign = hash ? base64.encodeBytes(hash, {url: true}) : null;
    const invalid = secretSign && secretSign !== parts[2];

    return {
      header, payload, error:( expired || invalid ) ? {expired, invalid} : null,
    };
  }
}



if (DEV) {
  console.info('=== BASE64 =========================================================');
  const base64 = new Base64();
  const check = (string: string, targetResult: string) => {
    const result = base64.encode(string);
    const backResult = base64.decode(result);
    console.info(string, result === targetResult, `[${targetResult}]`, backResult === string);
  };
  check('hello world', 'aGVsbG8gd29ybGQ=');
  check('Polyfon zwitschernd aßen Mäxchens Vögel Rüben, Joghurt und Quark', 'UG9seWZvbiB6d2l0c2NoZXJuZCBhw59lbiBNw6R4Y2hlbnMgVsO2Z2VsIFLDvGJlbiwgSm9naHVydCB1bmQgUXVhcms=');
  check('Franz jagt im Komplett verwahrlosten Taxi quer durh Bayern', 'RnJhbnogamFndCBpbSBLb21wbGV0dCB2ZXJ3YWhybG9zdGVuIFRheGkgcXVlciBkdXJoIEJheWVybg==');
  check('Franz jagt im Komplett verwahrlosten Taxi quer durh Bayern!!', 'RnJhbnogamFndCBpbSBLb21wbGV0dCB2ZXJ3YWhybG9zdGVuIFRheGkgcXVlciBkdXJoIEJheWVybiEh');
}

if (DEV) {
  console.info('=== SHA256 =========================================================');
  const sha256 = new Sha256();
  const check = (hash: string, string: string) => {
    const result = sha256.generate(string, {seperatedBlocks: true});
    console.info(result, result === hash, `(${string})`);
  };
  check('b94d27b9 934d3e08 a52e52d7 da7dabfa c484efe3 7a5380ee 9088f7ac e2efcde9', 'hello world');
  check('ba7816bf 8f01cfea 414140de 5dae2223 b00361a3 96177a9c b410ff61 f20015ad', 'abc');
  check('248d6a61 d20638b8 e5c02693 0c3e6039 a33ce459 64ff2167 f6ecedd4 19db06c1', 'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq');
}


if (DEV) {
  console.info('=== HMAC =========================================================');
  const hmacSha256 = new HmacSha256();
  const check = (hash: string, string: string, secret: string) => {
    const result = hmacSha256.generate(string, secret);
    console.info(result, result === hash, `(${string})`);
  };
  check('b69fef3e3fe467e1fcc7353673fd120dccbf41c82dc61c564a212363cee0f122', 'hello world', 'geheim');
}

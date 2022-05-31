// https://de.wikipedia.org/wiki/HMAC

import {Sha256} from './sha256';

const DEV = false;

const byteHex = (str: number | string) => typeof str === 'number' ? byteHex(str.toString(16)) : (str.length < 2) ? `0${str}` : str;
const pad8 = (str: number | string) => typeof str === 'number' ? pad8(str.toString(2)) : (str.length < 8) ? pad8(`0${str}`) : str;
const xor512 = (a: number[], b: number[]) => {
  const resultBytes: number[] = [];
  for (let i = 0; i < 64; i++) {
    const [aString, bString] = [pad8(a[i]).split(''), pad8(b[i]).split('')];
    resultBytes.push(parseInt(aString.map((a, i) => a !== bString[i] ? '1' : '0').join(''), 2));
  }
  return resultBytes;
};

const oPad: number[] = [];
const iPad: number[] = [];
for (let i = 0; i < 512; i++) {
  oPad.push(0x5c);
  iPad.push(0x36);
}


const utf8ToBytes = (inputString: string) => [...new TextEncoder().encode(inputString)];

class BitVector {

  public data: number[];

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

  public addByte(byte: number) {
    this.data.push(byte);
    this.length += 8;
  }

  public toInt() {
    let result = 0;
    this.data.forEach(num => {
      result = result * 256 + num;
    });
    return result;
  }

  public clone() {
    const result = new BitVector(null);
    result.data = [...this.data];
    result.length = this.length;
    return result;
  }

}

export class Hmac {

  constructor(private hashFunction: (input: number[]) => number[]) {
  }

  public generate(inputString: string, secret: string) {
    const inputBytes = utf8ToBytes(inputString);
    let secretBytes = utf8ToBytes(secret);

    if (secretBytes.length > 512) {
      secretBytes = this.hashFunction(utf8ToBytes(secret));
    }

    const secretVector = new BitVector(secretBytes);
    while (secretVector.length < 512) {
      secretVector.addByte(0);
    }

    const kIPad = xor512(secretVector.data, iPad);
    const koPad = xor512(secretVector.data, oPad);
    const hMac = this.hashFunction([...koPad, ...this.hashFunction([...kIPad, ...inputBytes])]);

    return hMac.map(num => byteHex(num)).join('');
  }
}


export class HmacSha256 extends Hmac {

  constructor() {
    super(inputBytes => new Sha256().generateFromBytes(inputBytes));
  }


}


if (DEV) {
  const hmacSha256 = new HmacSha256();
  const check = (hash: string, string: string, secret: string) => {
    const result = hmacSha256.generate(string, secret);
    console.info(result, result === hash, `(${string})`);
  };
  check('b69fef3e3fe467e1fcc7353673fd120dccbf41c82dc61c564a212363cee0f122', 'hello world', 'geheim');
}




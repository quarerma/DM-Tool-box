import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class HashService {
  hashString(input: string): string {
    const salt = bcrypt.genSaltSync();
    const hash = bcrypt.hashSync(input, salt);
    return Buffer.from(hash, 'utf-8').toString('base64');
  }

  verifyString(input: string, base64Hash: string): boolean {
    try {
      const decodedHash = Buffer.from(base64Hash, 'base64').toString('utf-8');
      return bcrypt.compareSync(input, decodedHash);
    } catch {
      return false;
    }
  }

  generateRandomToken(length = 64): string {
    return crypto.randomBytes(length).toString('hex');
  }

  sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  compareHash(a: string, b: string): boolean {
    const bufferA = Buffer.from(a);
    const bufferB = Buffer.from(b);
    if (bufferA.length !== bufferB.length) return false;
    return crypto.timingSafeEqual(bufferA, bufferB);
  }
}

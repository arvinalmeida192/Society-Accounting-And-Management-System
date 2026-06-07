import bcrypt from 'bcryptjs';

const BCRYPT_COST = 12;

/** SDD §26.2 AuthService — Phase 1: password hashing only */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

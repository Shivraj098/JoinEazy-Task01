import bcrypt from "bcryptjs";
import { env } from "../config/env.js";

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, env.BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Compared against when the email is unknown so that login takes similar time
// whether or not the account exists.
const decoyHash = bcrypt.hashSync("decoy-password-for-timing", env.BCRYPT_ROUNDS);

export async function verifyAgainstDecoy(password: string): Promise<void> {
  await bcrypt.compare(password, decoyHash);
}

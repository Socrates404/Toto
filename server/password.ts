
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  // Validate input parameters
  if (!supplied || !stored) {
    console.error("Invalid password comparison parameters:", { 
      suppliedExists: !!supplied, 
      storedExists: !!stored 
    });
    return false;
  }
  
  // Split the stored hash into hash and salt parts
  const parts = stored.split(".");
  if (parts.length !== 2) {
    console.error("Invalid stored password format:", { parts });
    return false;
  }
  
  const [hashed, salt] = parts;
  
  try {
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error("Error comparing passwords:", error);
    return false;
  }
}

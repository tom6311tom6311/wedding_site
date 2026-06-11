import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const ENCRYPTION_VERSION = "v1";

export function hmacSha256Hex(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function createBrowserToken() {
  return randomBytes(32).toString("base64url");
}

export function constantTimeEqual(first: string, second: string) {
  const firstBuffer = Buffer.from(first);
  const secondBuffer = Buffer.from(second);

  if (firstBuffer.length !== secondBuffer.length) {
    return false;
  }

  return timingSafeEqual(firstBuffer, secondBuffer);
}

export function encryptText(value: string, secret: string) {
  const key = createHash("sha256").update(secret).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    ENCRYPTION_VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

export function decryptText(value: string, secret: string) {
  const [version, encodedIv, encodedTag, encodedEncrypted] = value.split(":");

  if (version !== ENCRYPTION_VERSION || !encodedIv || !encodedTag || !encodedEncrypted) {
    throw new Error("Unsupported encrypted payload");
  }

  const key = createHash("sha256").update(secret).digest();
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(encodedIv, "base64url"),
  );

  decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encodedEncrypted, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

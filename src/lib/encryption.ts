import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from "crypto";

export interface EncryptedPayload {
    iv: string;
    data: string;
    tag: string;
}

/**
 * Derives a 256-bit encryption key from the API key using PBKDF2.
 * Uses a fixed salt for consistency across server restarts.
 */
function deriveKey(apiKey: string): Buffer {
    const salt = Buffer.from("anonymous-reporting-system-salt", "utf-8");
    return pbkdf2Sync(apiKey, salt, 100000, 32, "sha256");
}

/**
 * Encrypts a JSON string using AES-256-GCM with the API key.
 */
export function encryptPayload(apiKey: string, jsonString: string): EncryptedPayload {
    const key = deriveKey(apiKey);
    const iv = randomBytes(16);
    const cipher = createCipheriv("aes-256-gcm", key, iv);

    const encrypted = Buffer.concat([cipher.update(jsonString, "utf-8"), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
        iv: iv.toString("base64"),
        data: encrypted.toString("base64"),
        tag: tag.toString("base64"),
    };
}

/**
 * Decrypts an AES-256-GCM encrypted payload using the API key.
 */
export function decryptPayload(apiKey: string, encrypted: EncryptedPayload): string {
    const key = deriveKey(apiKey);
    const iv = Buffer.from(encrypted.iv, "base64");
    const tag = Buffer.from(encrypted.tag, "base64");
    const data = Buffer.from(encrypted.data, "base64");

    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return decrypted.toString("utf-8");
}

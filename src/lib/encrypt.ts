import crypto from "node:crypto";
import { config } from "dotenv"

config();

const ALGORITHM = "aes-256-gcm";

const KEY = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY as any, "base64");

export function encryptToken(token: string) {
    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv(
        ALGORITHM,
        KEY,
        iv
    );

    const encrypted = Buffer.concat([
        cipher.update(token, "utf8"),
        cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    return {
        encrypted: encrypted.toString("base64"),
        iv: iv.toString("base64"),
        authTag: authTag.toString("base64")
    };
}

export function decryptToken(data: any) {
    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        KEY,
        Buffer.from(data.iv, "base64")
    );

    decipher.setAuthTag(
        Buffer.from(data.authTag, "base64")
    );

    const decrypted = Buffer.concat([
        decipher.update(
            Buffer.from(data.encrypted, "base64")
        ),
        decipher.final()
    ]);

    return decrypted.toString("utf8");
}
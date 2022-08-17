import { createHash, randomBytes } from "crypto";

const base64URLEncode = (buffer) => {
    return buffer
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

const sha256 = (buffer) => {
    return createHash('sha256').update(buffer).digest();
}

const generatePKCEParams = () => {
    const codeVerifier = base64URLEncode(randomBytes(64));
    const codeChallenge = base64URLEncode(sha256(Buffer.from(codeVerifier)));
    return {
        codeVerifier,
        codeChallenge
    }
}
export { generatePKCEParams }

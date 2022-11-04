const base64URLEncode = (buffer) => {
    return window.btoa(buffer)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

const sha256 = (plain) => {
    const data = new TextEncoder().encode(plain);
    return crypto.subtle.digest('SHA-256', data);
}

const generateRandomString = (byteLen) => {
    const buffer = new Uint8Array(byteLen);
    window.crypto.getRandomValues(buffer);
    const randomString = [];
    for (let i = 0; i < buffer.length; i += 1) {
        randomString.push(String.fromCharCode(buffer[i]));
    }
    return base64URLEncode(randomString.join(''));
}

const generatePKCEParams = async () => {
    const codeVerifier = generateRandomString(64);
    const codeVerifierSha256ArrayBuffer = await sha256(codeVerifier);
    const codeVerifierSha256Chars = String.fromCharCode.apply(null, new Uint8Array(codeVerifierSha256ArrayBuffer));
    const codeChallenge = base64URLEncode(codeVerifierSha256Chars);
    return {
        codeVerifier,
        codeChallenge
    }
}
export { generatePKCEParams, generateRandomString }

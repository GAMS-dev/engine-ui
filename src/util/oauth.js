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

const str2ab = (str) => {
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}

const ab2str = (buf) => {
    return String.fromCharCode.apply(null, new Uint8Array(buf));
}

const base64URLDecode = (input) => {
    let output = input
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    const pad = output.length % 4;
    if (pad) {
        if (pad === 1) {
            throw new Error('InvalidLengthError: Input base64url string is the wrong length to determine padding');
        }
        output += new Array(5 - pad).join('=');
    }
    return window.atob(output)
}

const encryptRSA = async (publicKeyB64, dataToEncrypt) => {
    const binaryDer = str2ab(base64URLDecode(publicKeyB64));
    const publicKey = await window.crypto.subtle.importKey(
        "spki",
        binaryDer,
        {
            name: "RSA-OAEP",
            hash: "SHA-256",
        },
        true,
        ["encrypt"],
    );
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const AESKey = await window.crypto.subtle.generateKey(
        {
            name: "AES-GCM",
            length: 256,
        },
        true,
        ["encrypt", "decrypt"],
    );
    const encryptedData = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        AESKey,
        new TextEncoder().encode(dataToEncrypt),
    );
    const encryptedAESKey = await window.crypto.subtle.encrypt(
        {
            name: "RSA-OAEP",
        },
        publicKey,
        await window.crypto.subtle.exportKey("raw", AESKey)
    );
    return {
        'aes_key': base64URLEncode(ab2str(encryptedAESKey)),
        'aes_iv': base64URLEncode(ab2str(iv.buffer)),
        'data': base64URLEncode(ab2str(encryptedData))
    }
}
export { generatePKCEParams, generateRandomString, encryptRSA }

import { Cipheriv, createCipheriv, createDecipheriv, Decipheriv, pbkdf2 } from 'crypto';
import { AES_INITIALIZE_VACTOR, AES_KEY, PBKDF2_ITERATION } from './constant';
import { promisify } from 'util';

export function encryptAes(text: string): string {
	const cipher: Cipheriv = createCipheriv('aes-256-cbc', AES_KEY, AES_INITIALIZE_VACTOR);

	return cipher.update(text, 'utf-8', 'hex') + cipher.final('hex');
}

export function decryptAes(text: string): string {
	const decipher: Decipheriv = createDecipheriv('aes-256-cbc', AES_KEY, AES_INITIALIZE_VACTOR);

	return decipher.update(text, 'hex', 'utf-8') + decipher.final('utf-8');
}

export function encryptPbkdf2(text: string, salt: string): Promise<string> {
	return promisify(pbkdf2)(text, Buffer.from(salt, 'hex'), PBKDF2_ITERATION, 64, 'sha512')
	.then(function (buffer: Buffer): string {
		return buffer.toString('hex');
	});
}
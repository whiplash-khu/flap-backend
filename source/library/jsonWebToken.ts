import { createHmac } from 'crypto';
import { getEpoch } from './time';

export default class JsonWebToken<T = Record<string, unknown>> {
	#token: string;
	#secretKey: string;
	#payload: T & {
		exp: number;
	};

	public static create<T = Record<string, unknown>>(payload: T & {
		exp: number;
	}, secretKey: string): string {
		const headerAndPayload: string = 'eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.' + Buffer.from(JSON.stringify(payload))
			.toString('base64url');

		return headerAndPayload + '.' + createHmac('sha512', secretKey).update(headerAndPayload)
			.digest('base64url');
	}

	constructor(token: string, secretKey: string) {
		this.#token = token;

		try {
			const firstIndex: number = token.indexOf('.');
			const lastIndex: number = token.lastIndexOf('.');

			if(firstIndex === -1 || lastIndex === -1 || firstIndex === lastIndex) {
				throw null
			}

			this.#payload = JSON.parse(Buffer.from(token.slice(firstIndex+1, lastIndex), 'base64url')
				.toString('utf-8'));
		} catch {
			throw new Error('Payload should be valid');
		}

		if(typeof this.#payload.exp !== 'number') {
			throw new Error('Payload must have exp');
		}

		this.#secretKey = secretKey;
	}

	public get payload(): T {
		return this.#payload;
	}

	public set secretKey(secretKey: string) {
		this.#secretKey = secretKey;
	}

	public isValid(): boolean {
		const firstIndex: number = this.#token.indexOf('.');
		const lastIndex: number = this.#token.lastIndexOf('.');

		if(firstIndex === -1 || lastIndex === -1 || firstIndex === lastIndex) {
			return false;
		}

		return this.#payload !== null && createHmac('sha512', this.#secretKey).update(this.#token.slice(0, lastIndex))
			.digest('base64url') === this.#token.slice(lastIndex+1) && this.#payload["exp"] > getEpoch();
	}
}
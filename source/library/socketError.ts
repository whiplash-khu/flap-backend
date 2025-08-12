export class SocketError extends Error {
	constructor(public event: string, message: string) {
		super(message);
	}
}
export default function serializeHandler(payload: unknown, statusCode: number): string {
	switch(statusCode) {
		case 204:
		case 304: {
			payload = undefined;

			break;
		}
		default: {
			payload ??= null;
		}
	}

	return JSON.stringify(statusCode < 300 ? {
		status: 'success',
		data: payload,
	} : payload);
}
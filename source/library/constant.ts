export const ENVIRONMENT_VARIABLE_NAMES = [
	'DATABASE_URL',
	'CACHE_DATABASE_URL',
	'SEARCH_DATABASE_URL',
	'EMAIL_USER',
	'EMAIL_PASSWORD',
	'EMAIL_HOST',
	'EMAIL_PORT',
	'PORT',
	'RATE_LIMIT',
	'PBKDF2_ITERATION',
	'AES_KEY',
	'AES_INITIALIZE_VACTOR',
	'STORAGE_REGION',
	'STORAGE_ENDPOINT',
	'STORAGE_ACCESS_KEY',
	'STORAGE_SECRET_KEY',
	'STORAGE_BUCKET_NAME'
] as const;

export const HTTP_ERROR_NAMES = {
	400: 'BadRequest',
	401: 'Unauthorized',
	//402: 'PaymentRequired',
	403: 'Forbidden',
	404: 'NotFound',
	405: 'MethodNotAllowed',
	//406: 'NotAcceptable',
	//407: 'ProxyAuthenticationRequired',
	//408: 'RequestTimeout',
	//409: 'Conflict',
	//410: 'Gone',
	//411: 'LengthRequired',
	//412: 'PreconditionFailed',
	413: 'PayloadTooLarge',
	//414: 'URITooLong',
	415: 'UnsupportedMediaType',
	//416: 'RangeNotSatisfiable',
	//417: 'ExpectationFailed',
	418: 'ImATeapot',
	//421: 'MisdirectedRequest',
	//422: 'UnprocessableEntity',
	//423: 'Locked',
	//424: 'FailedDependency',
	//425: 'UnorderedCollection',
	//426: 'UpgradeRequired',
	//428: 'PreconditionRequired',
	429: 'TooManyRequests',
	//431: 'RequestHeaderFieldsTooLarge',
	//451: 'UnavailableForLegalReasons',
	500: 'InternalServerError',
	//501: 'NotImplemented',
	//502: 'BadGateway',
	//503: 'ServiceUnavailable',
	//504: 'GatewayTimeout',
	//505: 'HTTPVersionNotSupported',
	//506: 'VariantAlsoNegotiates',
	//507: 'InsufficientStorage',
	//508: 'LoopDetected',
	//509: 'BandwidthLimitExceeded',
	//510: 'NotExtended',
	//511: 'NetworkAuthenticationRequire',
} as const;

export const IS_DEVELOPMENT: boolean = process['env']['NODE_ENV'] === 'development';

export const AES_KEY: Buffer = Buffer.from(process['env']['AES_KEY'], 'hex');

export const AES_INITIALIZE_VACTOR: Buffer = Buffer.from(process['env']['AES_INITIALIZE_VACTOR'], 'hex');

export const PBKDF2_ITERATION: number = Number.parseInt(process['env']['PBKDF2_ITERATION'], 10);

export const FILE_SIZE_LIMIT: number = Number.parseInt(process['env']['FILE_SIZE_LIMIT'] || '524300', 10);

export const VERIFICATION_TEMPLATE: string = `<body style="margin:100px auto;width:540px;border-top:4px solid #1F2F56;padding:0 4px">
	<header style="margin:32px 0">
		<h1 style="margin:0;font-size:28px;color:#111111">Flap</h1>
		<h2 style="margin:0;font-size:16px;font-weight:400;padding:0 2px">회원가입 메일 인증 안내</h2>
	</header>
	<main style="margin:64px 0;font-size:16px">
		<p>Flap에 탑승해주셔서 감사합니다.</p>
		<p>아래 버튼을 눌러 회원가입을 완료해주세요.</p>
		<br>
		<a href="https://flap.kr/auth/email?token={token}" style="text-decoration:none">
			<div style="width:210px;text-align:center;line-height:48px;color:#fff;background:#1F2F56">메일 인증</div>
		</a>
	</main>
	<footer style="margin:64px 0;border-top:1px solid #ddd;color:#555;font-size:12px;padding:16px 2px 0">
		<p style="margin:0">만약 버튼이 정상적으로 클릭되지 않는다면, 아래 링크로 접속해 주세요.</p><a
			href="https://flap.kr/auth/email?token={token}">https://flap.kr/auth/email?token={token}</a>
	</footer>
</body>`;

export const LOST_PASSWORD_TEMPLATE: string = `<body style="margin:100px auto;width:540px;border-top:4px solid #1F2F56;padding:0 4px">
	<header style="margin:32px 0">
		<h1 style="margin:0;font-size:28px;color:#111111">Flap</h1>
		<h2 style="margin:0;font-size:16px;font-weight:400;padding:0 2px">비밀번호 재설정 안내</h2>
	</header>
	<main style="margin:64px 0;font-size:16px">
		<p>비밀번호 재설정 요청이 접수되었습니다.</p>
		<p>아래 버튼을 눌러 새로운 비밀번호를 설정해주세요.</p>
		<br>
		<a href="https://flap.kr/auth/lostEmail?token={token}" style="text-decoration:none">
			<div style="width:210px;text-align:center;line-height:48px;color:#fff;background:#1F2F56">비밀번호 재설정</div>
		</a>
	</main>
	<footer style="margin:64px 0;border-top:1px solid #ddd;color:#555;font-size:12px;padding:16px 2px 0">
		<p style="margin:0">만약 버튼이 정상적으로 클릭되지 않는다면, 아래 링크로 접속해 주세요.</p><a
			href="https://flap.kr/auth/lostEmail?token={token}">https://flap.kr/auth/lostEmail?token={token}</a>
	</footer>
</body>`;

export const TAG_REGULAR_EXPRESSION: RegExp = /(?<=#)[a-zA-Z0-9ㄱ-ㅣ가-힣_]{1,16}/g;

export const enum Emojis {
	HEART = 1,
	THUMBS_UP = 2,
	CHECK = 3,
	SMILE = 4,
	SURPISE = 5,
	CRY = 6
}

export const enum ScheduleAttendanceStatus {
	ABSENT = 1,
	LATE = 2,
	ATTEND = 3
}

export const SUPPORTED_MIME_TYPES: Set<string> = new Set<string>([
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
	'image/avif',
	'image/heic'
]);

export const DAYS: Record<string, number> = {
	'Mon': 1,
	'Tue': 2,
	'Wed': 3,
	'Thu': 4,
	'Fri': 5,
	'Sat': 6,
	'Sun': 0
};

export const enum Banks {
	KDB산업은행 = 2,
	IBK기업은행 = 3,
	KB국민은행 = 4,
	수협은행 = 7,
	NH농협은행 = 11,
	우리은행 = 20,
	SC은행 = 23,
	씨티은행 = 27,
	대구은행 = 31,
	부산은행 = 32,
	광주은행 = 34,
	제주은행 = 35,
	전북은행 = 37,
	경남은행 = 39,
	MG새마을금고 = 45,
	신협 = 48,
	저축은행 = 50,
	산림조합 = 64,
	우체국 = 71,
	하나은행 = 81,
	신한은행 = 88,
	케이뱅크 = 89,
	카카오뱅크 = 90,
	토스뱅크 = 92,
	SBI저축은행 = 103
}

export const enum WebSocketCloseCodes {
	NORMAL_CLOSURE = 1000,
	GOING_AWAY = 1001,
	PROTOCOL_ERROR = 1002,
	UNSUPPORTED_DATA = 1003,
	RESERVED = 1004,
	NO_STATUS_RECEIVED = 1005,
	ABNORMAL_CLOSURE = 1006,
	INVALID_FRAME_PAYLOAD_DATA = 1007,
	POLICY_VIOLATION = 1008,
	MESSAGE_TOO_BIG = 1009,
	MANDATORY_EXTENSION = 1010,
	INTERNAL_ERROR = 1011,
	SERVICE_RESTART = 1012,
	TRY_AGAIN_LATER = 1013,
	BAD_GATEWAY = 1014,
	TLS_HANDSHAKE_FAILURE = 1015
}

export const enum EventTypes {
	AUTH = 1,
	READY = 2,
	CREATE_FEE = 3,
	CREATE_SCHEDULE = 4,
	CREATE_POST = 5,
	CREATE_NOTICE = 6,
	CREATE_CHAT = 7,
	CREATE_MESSAGE = 8
}
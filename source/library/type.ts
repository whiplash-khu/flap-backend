import { FastifyBaseLogger, FastifyReply, FastifySchema, FastifyTypeProvider, HTTPMethods, RouteHandlerMethod, RouteOptions as _RouteOptions } from 'fastify';
import { IncomingMessage, Server, ServerResponse } from 'http';
import { ArraySchema, BooleanSchema, ExtendedSchema, IntegerSchema, NullSchema, NumberSchema, ObjectSchema, StringSchema } from 'fluent-json-schema';
import { ColumnType, GeneratedAlways, Selectable } from 'kysely';

export type RequiredJSONSchema = ObjectSchema | StringSchema | NumberSchema | ArraySchema | IntegerSchema | BooleanSchema;

export interface RouteOptions extends Omit<_RouteOptions, 'handler' | 'schema'> {
	method: HTTPMethods;
	handler: RouteHandlerMethod<Server, IncomingMessage, ServerResponse, any, unknown, FastifySchema, FastifyTypeProvider, FastifyBaseLogger>;
	schema?: Partial<Record<'body' | 'querystring' | 'params' | 'headers', ObjectSchema | NullSchema | ExtendedSchema | ArraySchema>>;
	excludePreHandler?: boolean;
}

export type JsendResponse = {
	status: 'success';
	data: unknown;
} | {
	status: 'error';
	message: string;
} | {
	status: 'fail';
	data: {
		title: string;
		body?: string;
	};
};

export interface ReplyLog {
	res: FastifyReply;
	responseTime: number;
}

export type Resolve<T = void> = (value: T) => void;

export type Reject = (error: unknown) => void;

type Unupdateable<T> = ColumnType<T, T, never>;

type Uninsertable<T> = ColumnType<T, never, T>;

type Camelize<S extends string> = S extends `${infer P}_${infer Q}${infer R}` ? `${Lowercase<P>}${Uppercase<Q>}${Camelize<R>}` : Lowercase<S>;

type CamelizeKeys<T> = {
	[K in keyof T as Camelize<K & string>]: T[K];
};

export interface MediaTable {
	id: GeneratedAlways<number>;
	hash: Unupdateable<string>;
	type: Unupdateable<string>;
	created_at: Unupdateable<Date>;
}

export interface UserTable {
	id: GeneratedAlways<number>;
	email: Unupdateable<string>;
	password: ColumnType<string>;
	name: ColumnType<string>;
	birth_at: ColumnType<Date>;
	school: ColumnType<string>;
	media_id: ColumnType<number>;
	created_at: GeneratedAlways<Date>;
	deleted_at: Uninsertable<Date | null>;
}

export interface GroupTable {
	id: GeneratedAlways<number>;
	media_id: ColumnType<number>;
	user_id: ColumnType<number>;
	name: ColumnType<string>;
	introduction: ColumnType<string>;
	description: ColumnType<string>;
	start_at: ColumnType<Date>;
	end_at: ColumnType<Date>;
	created_at: GeneratedAlways<Date>;
	deleted_at: Uninsertable<Date | null>;
}

export interface GroupUserTable {
	id: GeneratedAlways<number>;
	group_id: Unupdateable<number>;
	user_id: Unupdateable<number>;
}

export interface GroupQuestionTable {
	id: GeneratedAlways<number>;
	group_id: Unupdateable<number>;
	content: Unupdateable<string>;
}

export interface FormTable {
	id: GeneratedAlways<number>;
	group_id: Unupdateable<number>;
	user_id: Unupdateable<number>;
	created_at: GeneratedAlways<Date>;
}

export interface FormAnswerTable {
	id: GeneratedAlways<number>;
	form_id: Unupdateable<number>;
	content: Unupdateable<string>;
}

export interface TagTable {
	id: GeneratedAlways<number>;
	name: Unupdateable<string>;
}

export interface GroupTagTable {
	group_id: Unupdateable<number>;
	tag_id: Unupdateable<number>;
}

export interface PostTable {
	id: GeneratedAlways<number>;
	group_id: Unupdateable<number>;
	user_id: Unupdateable<number>;
	is_notice: ColumnType<boolean>;
	content: ColumnType<string>;
	created_at: GeneratedAlways<Date>;
	deleted_at: Uninsertable<Date | null>;
}

export interface PostReactionTable {
	post_id: Unupdateable<number>;
	user_id: Unupdateable<number>;
	emoji: Unupdateable<string>;
}

export interface ScheduleTable {
	id: GeneratedAlways<number>;
	group_id: Unupdateable<number>;
	name: ColumnType<string>;
	start_at: ColumnType<Date>;
	end_at: ColumnType<Date>;
	created_at: GeneratedAlways<Date>;
	deleted_at: Uninsertable<Date | null>;
}

export interface ScheduleAttendanceTable {
	schedule_id: Unupdateable<number>;
	user_id: Unupdateable<number>;
	status: ColumnType<number>;
}

export interface FeeTable {
	id: GeneratedAlways<number>;
	group_id: Unupdateable<number>;
	account: ColumnType<string>;
	amount: ColumnType<number>;
	end_at: ColumnType<Date>;
	created_at: GeneratedAlways<Date>;
}

export interface FeeSubmissionTable {
	fee_id: Unupdateable<number>;
	user_id: Unupdateable<number>;
	created_at: GeneratedAlways<Date>;
}

export interface ChatTable {
	id: GeneratedAlways<number>;
	name: ColumnType<string>;
	created_at: GeneratedAlways<Date>;
}

export interface ChatUserTable {
	chat_id: Unupdateable<number>;
	user_id: Unupdateable<number>;
}

export interface ChatMessageTable {
	id: GeneratedAlways<number>;
	chat_id: Unupdateable<number>;
	user_id: Unupdateable<number>;
	content: Unupdateable<string>;
	created_at: GeneratedAlways<Date>;
}

export interface VerificationTable {
	email: Unupdateable<string>;
	token: string;
	created_at: GeneratedAlways<Date>;
}

export interface UserLostPasswordTable {
	user_id: Unupdateable<number>;
	token: string;
	created_at: GeneratedAlways<Date>;
}

export interface Database {
	media: MediaTable;
	user: UserTable;
	user_lost_password: UserLostPasswordTable;
	group: GroupTable;
	group_user: GroupUserTable;
	group_question: GroupQuestionTable;
	form: FormTable;
	form_answer: FormAnswerTable;
	tag: TagTable;
	group_tag: GroupTagTable;
	post: PostTable;
	post_reaction: PostReactionTable;
	schedule: ScheduleTable;
	schedule_attendance: ScheduleAttendanceTable;
	fee: FeeTable;
	fee_submission: FeeSubmissionTable;
	chat: ChatTable;
	chat_user: ChatUserTable;
	chat_message: ChatMessageTable;
	verification: VerificationTable;
}

export type Media = Selectable<CamelizeKeys<MediaTable>>;

export type User = Selectable<CamelizeKeys<UserTable>>;

export type Group = Selectable<CamelizeKeys<GroupTable>>;

export type GroupUser = Selectable<CamelizeKeys<GroupUserTable>>;

export type GroupQuestion = Selectable<CamelizeKeys<GroupQuestionTable>>;

export type Form = Selectable<CamelizeKeys<FormTable>>;

export type FormAnswer = Selectable<CamelizeKeys<FormAnswerTable>>;

export type Tag = Selectable<CamelizeKeys<TagTable>>;

export type GroupTag = Selectable<CamelizeKeys<GroupTagTable>>;

export type Post = Selectable<CamelizeKeys<PostTable>>;

export type PostReaction = Selectable<CamelizeKeys<PostReactionTable>>;

export type Schedule = Selectable<CamelizeKeys<ScheduleTable>>;

export type ScheduleAttendance = Selectable<CamelizeKeys<ScheduleAttendanceTable>>;

export type Fee = Selectable<CamelizeKeys<FeeTable>>;

export type FeeSubmission = Selectable<CamelizeKeys<FeeSubmissionTable>>;

export type Chat = Selectable<CamelizeKeys<ChatTable>>;

export type ChatUser = Selectable<CamelizeKeys<ChatUserTable>>;

export type ChatMessage = Selectable<CamelizeKeys<ChatMessageTable>>;

export type Verification = Selectable<CamelizeKeys<VerificationTable>>;

export type UserLostPassword = Selectable<CamelizeKeys<UserLostPasswordTable>>;

export interface Pagenation {
	index?: number;
	size: number;
}
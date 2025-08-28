import { RawBuilder, sql } from 'kysely';
import { DAYS } from './constant';
import { Calender } from './type';

export function parseTime(time: string): number {
	const epoch: number = new Date(time).getTime() / 1000;
	const start: number = time.lastIndexOf('.') + 1;

	if(start === 0) {
		return epoch;
	}

	let end: number = time['length'];

	for(let i: number = start, j: number = 0; i < time['length']; i++) {
		j = time.charCodeAt(i);

		if(j < 48 || j > 57) {
			end = i;

			break;
		}
	}

	return Math.trunc(epoch) + Number.parseInt(time.slice(start, end)) / 10 ** (end - start);
}

export function getEpoch(): number {
	return Math.trunc((performance['timeOrigin'] + performance.now()) / 1000);
}

export function getPreciseEpoch(): number {
	return Math.trunc((performance['timeOrigin'] + performance.now()) * 1000) / 1000000;
}

export function getTimestamp(time: number = getPreciseEpoch()): RawBuilder<Date> {
	return sql<Date>`to_timestamp(${time})`;
}

export function getCalender(year: number, month: number): Calender {
	return {
		startingDay: DAYS[new Date(year, month - 1, 1).toLocaleString('en-US', {
			weekday: 'short'
		})],
		length: (new Date(year, month, 0)).getDate()
	};
}
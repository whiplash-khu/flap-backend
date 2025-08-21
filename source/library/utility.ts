export default function getEpoch(date: Date = new Date()): number {
	return Math.trunc(date.getTime() / 1000);
}
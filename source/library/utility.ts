export default function getEpoch(): number {
	return Math.trunc(Date.now() / 1000);
}
/** "2026-10-10T22:00:00-04:00" -> "Oct 10, 10:00 PM ET" (times are stored in America/New_York). */
export function fmtTime(iso: string | undefined): string {
	if (!iso) return '';
	return (
		new Date(iso).toLocaleString('en-US', {
			timeZone: 'America/New_York',
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		}) + ' ET'
	);
}

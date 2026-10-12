// Row shapes of /opt/ai-briefing/data/briefing.db (see README.md). Booleans are 0/1.
export interface Briefing {
	date: string;
	title: string;
	coverage: string | null;
	intro_html: string | null;
	outage_alert: number;
	created_at: string;
}
export interface Section {
	briefing_date: string;
	position: number;
	title: string;
	note_html: string | null;
}
export interface Item {
	id: number;
	briefing_date: string;
	category: string;
	position: number;
	headline: string | null;
	body: string;
	body_html: string;
	is_outage: number;
}
export interface Link {
	item_id: number;
	label: string;
	url: string;
}
export interface OutageCheck {
	id: number;
	checked_at: string;
	is_alert: number;
	text: string;
}
export interface Source {
	id: number;
	grp: string;
	subgroup: string | null;
	position: number;
	value: string;
	note: string | null;
}

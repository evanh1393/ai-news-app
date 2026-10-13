// Strict parser for sources.md, the source list Grok Bot reads on each run. We edit it; the bot only reads it.
// The same Drive file is what Grok Bot reads, so editing it there changes both the bot and the Sources page.
//
//   # Title                      optional, first line
//   Text and bullets before the first ## are allowed and ignored (e.g. "Last updated: …", notes to the bot).
//   ## Group                     → sources.grp
//   ### Subgroup                 → sources.subgroup, until the next ## or ###
//   A paragraph right under a heading, before its first "- " line → one row (e.g. a rule for that group)
//   - inline markdown            → one row
//
// Anything else throws, so a bad edit is skipped and the page keeps the previous list.
import { checkInline, FormatError } from './briefing-md.js';

const MAX_BYTES = 256 * 1024;
const MAX_ROWS = 500;

/** @typedef {{ grp: string, subgroup: string | null, position: number, value_md: string }} SourceRow */

/**
 * @param {string} msg
 * @returns {never}
 */
function fail(msg) {
	throw new FormatError(msg);
}

/**
 * @param {string} source
 * @returns {SourceRow[]}
 */
export function parseSources(source) {
	if (Buffer.byteLength(source) > MAX_BYTES) fail('file too large');
	const lines = source.replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');

	/** @type {SourceRow[]} */
	const rows = [];
	/** @type {Set<string>} */
	const groups = new Set();
	/** @type {string | null} */
	let grp = null;
	/** @type {string | null} */
	let subgroup = null;
	/** @type {string[]} lines of the note paragraph under the current heading */
	let note = [];
	let bullets = false; // a "- " line has come since the current heading

	/** @param {string} md */
	const add = (md) => {
		checkInline(md);
		rows.push({ grp: /** @type {string} */ (grp), subgroup, position: rows.length + 1, value_md: md });
	};
	const endNote = () => {
		if (note.length) add(note.join(' '));
		note = [];
	};
	lines.forEach((raw, i) => {
		const line = raw.trimEnd();
		if (/^```|^\s*\|/.test(line)) fail(`code blocks and tables aren't allowed: ${line}`);
		let m;
		if (/^(#|[-*]\s)/.test(line) || !line.trim()) endNote();
		if ((m = /^#\s+(.+)$/.exec(line))) {
			if (grp || rows.length || lines.slice(0, i).some((l) => l.trim())) fail(`"# ${m[1]}" must be the first line`);
		} else if ((m = /^##\s+(.+)$/.exec(line))) {
			grp = checkInline(m[1]).text;
			if (groups.has(grp)) fail(`duplicate group: ${grp}`);
			groups.add(grp);
			subgroup = null;
			bullets = false;
		} else if ((m = /^###\s+(.+)$/.exec(line))) {
			if (!grp) fail(`"### ${m[1]}" comes before any ## group`);
			subgroup = checkInline(m[1]).text;
			bullets = false;
		} else if (/^#/.test(line)) {
			fail(`unexpected heading: ${line}`);
		} else if ((m = /^[-*]\s+(.+)$/.exec(line))) {
			if (!grp) return; // preamble
			add(m[1].trim());
			bullets = true;
		} else if (line.trim() && grp) {
			if (bullets) fail(`text after the "- " lines under "${grp}" (each source is one line): ${line}`);
			note.push(line.trim());
		}
	});
	endNote();

	if (!rows.length) fail('no sources');
	if (rows.length > MAX_ROWS) fail('too many sources');
	return rows;
}

// Strict parser for sources.md, the source list Grok Bot reads on each run. We edit it; the bot only reads it.
// The same Drive file is what Grok Bot reads, so editing it there changes both the bot and the Sources page.
//
//   # Title                      optional, first line
//   Paragraphs before the first ## are allowed and ignored (e.g. "Last updated: …").
//   ## Group                     → sources.grp
//   ### Subgroup                 → sources.subgroup, until the next ## or ###
//   - inline markdown            → one row; must sit under a ## heading
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
	lines.forEach((raw, i) => {
		const line = raw.trimEnd();
		if (/^```|^\s*\|/.test(line)) fail(`code blocks and tables aren't allowed: ${line}`);
		let m;
		if ((m = /^#\s+(.+)$/.exec(line))) {
			if (grp || rows.length || lines.slice(0, i).some((l) => l.trim())) fail(`"# ${m[1]}" must be the first line`);
		} else if ((m = /^##\s+(.+)$/.exec(line))) {
			grp = checkInline(m[1]).text;
			if (groups.has(grp)) fail(`duplicate group: ${grp}`);
			groups.add(grp);
			subgroup = null;
		} else if ((m = /^###\s+(.+)$/.exec(line))) {
			if (!grp) fail(`"### ${m[1]}" comes before any ## group`);
			subgroup = checkInline(m[1]).text;
		} else if (/^#/.test(line)) {
			fail(`unexpected heading: ${line}`);
		} else if ((m = /^[-*]\s+(.+)$/.exec(line))) {
			if (!grp) fail(`source before any ## group: ${line}`);
			checkInline(m[1]);
			rows.push({ grp, subgroup, position: rows.length + 1, value_md: m[1].trim() });
		} else if (line.trim() && grp) {
			fail(`text under "${grp}" must be "- " lines: ${line}`);
		}
	});

	if (!rows.length) fail('no sources');
	if (rows.length > MAX_ROWS) fail('too many sources');
	return rows;
}

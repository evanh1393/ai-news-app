#!/usr/bin/env node
// Pulls Grok Bot's briefing-YYYY-MM-DD.md files from the "AI Briefings" Drive folder into briefing.db.
// Runs on CT 101 as briefing-pull (deploy/briefing-pull.service). Nothing connects in: this reaches
// out to Google with a service account that can only read that one folder.
//
//   node ingest/pull.js --check      list the folder; touches no database
//   node ingest/pull.js --dry-run    download and validate new/changed files; writes nothing
//   node ingest/pull.js --file X.md  validate a local file; no network
//   node ingest/pull.js              ingest new/changed files
//
// Writes go to a copy of the database that is swapped in with rename(), so the app (which opens a
// fresh read-only connection per request) never sees a half-written file. The previous version is
// kept as briefing.db.prev.
import { createSign } from 'node:crypto';
import { existsSync, linkSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import Database from 'better-sqlite3';
import { needsMigration, openWriter, staleDates } from './apply.js';
import { FormatError, parseBriefing } from './briefing-md.js';

const KEY_PATH = process.env.DRIVE_KEY ?? '/etc/ai-briefing/drive-key.json';
const FOLDER_ID = process.env.DRIVE_FOLDER_ID ?? '11AOFN-eH7oDUXnxa4RABCxc2HQDNBw3f';
const DB_PATH = process.env.BRIEFING_DB ?? '/opt/ai-briefing/data/briefing.db';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE = 'https://www.googleapis.com/drive/v3/files';
const MAX_BYTES = 512 * 1024;
const NAME = /^briefing-(\d{4}-\d{2}-\d{2})\.md$/;

const b64url = (s) => Buffer.from(s).toString('base64url');

async function http(url, init = {}) {
	const res = await fetch(url, { ...init, signal: AbortSignal.timeout(30_000) });
	if (!res.ok) {
		const body = (await res.text()).slice(0, 300);
		throw new Error(`${init.method ?? 'GET'} ${url.split('?')[0]} -> ${res.status} ${body}`);
	}
	return res;
}

/** Service-account JWT exchanged for a one-hour read-only Drive token. Returns { token, email }. */
async function accessToken() {
	const key = JSON.parse(readFileSync(KEY_PATH, 'utf8'));
	const now = Math.floor(Date.now() / 1000);
	const unsigned = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(
		JSON.stringify({
			iss: key.client_email,
			scope: 'https://www.googleapis.com/auth/drive.readonly',
			aud: TOKEN_URL,
			iat: now,
			exp: now + 3600
		})
	)}`;
	const sig = createSign('RSA-SHA256').update(unsigned).sign(key.private_key, 'base64url');
	const res = await http(TOKEN_URL, {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
			assertion: `${unsigned}.${sig}`
		})
	});
	return { token: (await res.json()).access_token, email: key.client_email };
}

async function listFolder(token) {
	const files = [];
	let pageToken;
	do {
		const qs = new URLSearchParams({
			q: `'${FOLDER_ID}' in parents and trashed = false`,
			fields: 'nextPageToken, files(id, name, mimeType, md5Checksum, size, modifiedTime)',
			pageSize: '1000',
			supportsAllDrives: 'true',
			includeItemsFromAllDrives: 'true'
		});
		if (pageToken) qs.set('pageToken', pageToken);
		const res = await http(`${DRIVE}?${qs}`, { headers: { authorization: `Bearer ${token}` } });
		const page = await res.json();
		files.push(...page.files);
		pageToken = page.nextPageToken;
	} while (pageToken);
	return files;
}

/** Briefing files only, newest upload winning if a name appears twice. Logs anything skipped. */
function briefingFiles(files) {
	const byName = new Map();
	for (const f of files) {
		if (!NAME.test(f.name)) {
			console.warn(`skip ${f.name}: not a briefing-YYYY-MM-DD.md file`);
			continue;
		}
		if (f.mimeType.startsWith('application/vnd.google-apps.') || !f.md5Checksum) {
			console.warn(`skip ${f.name}: stored as ${f.mimeType}, not a plain file`);
			continue;
		}
		if (Number(f.size) > MAX_BYTES) {
			console.warn(`skip ${f.name}: ${f.size} bytes is over the ${MAX_BYTES} byte limit`);
			continue;
		}
		const prev = byName.get(f.name);
		if (prev) console.warn(`${f.name} is in the folder twice; using the newest`);
		if (!prev || f.modifiedTime > prev.modifiedTime) byName.set(f.name, f);
	}
	return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

async function download(token, f) {
	const res = await http(`${DRIVE}/${encodeURIComponent(f.id)}?alt=media`, {
		headers: { authorization: `Bearer ${token}` }
	});
	const buf = Buffer.from(await res.arrayBuffer());
	if (buf.length > MAX_BYTES) throw new FormatError('file too large');
	return buf.toString('utf8');
}

/** name -> md5 already ingested. Read-only; empty before the first ingest and before the *_md migration. */
function ingestedFiles() {
	if (!existsSync(DB_PATH)) return new Map();
	const db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
	try {
		const has = db.prepare("SELECT 1 FROM sqlite_master WHERE name = 'drive_files'").get();
		return has && !needsMigration(db) ? new Map(db.prepare('SELECT name, md5 FROM drive_files').all().map((r) => [r.name, r.md5])) : new Map();
	} finally {
		db.close();
	}
}

/** Apply entries to a copy of the database, check it, and swap it in. */
async function commit(entries) {
	const dir = dirname(DB_PATH);
	const tmp = join(dir, `.${basename(DB_PATH)}.pull`);
	const prev = `${DB_PATH}.prev`;
	rmSync(tmp, { force: true });
	const live = new Database(DB_PATH, { readonly: true, fileMustExist: true });
	try {
		await live.backup(tmp);
	} finally {
		live.close();
	}
	const db = new Database(tmp);
	try {
		openWriter(db).applyAll(entries);
		const stale = staleDates(db);
		if (stale.length) throw new Error(`not re-ingested after the markdown migration: ${stale.join(', ')}`);
		const check = db.pragma('quick_check', { simple: true });
		if (check !== 'ok') throw new Error(`quick_check on new database: ${check}`);
	} catch (e) {
		db.close();
		rmSync(tmp, { force: true });
		throw e;
	}
	db.close();
	rmSync(prev, { force: true });
	linkSync(DB_PATH, prev);
	renameSync(tmp, DB_PATH);
}

/** --check: Drive answers "no access" with an empty list, so say which case this is. */
async function check(token, email) {
	const auth = { headers: { authorization: `Bearer ${token}` } };
	console.log(`signed in as ${email}`);
	const res = await fetch(`${DRIVE}/${encodeURIComponent(FOLDER_ID)}?fields=id,name,mimeType&supportsAllDrives=true`, {
		...auth,
		signal: AbortSignal.timeout(30_000)
	});
	if (res.status === 404) {
		console.error(`folder ${FOLDER_ID} not found: wrong ID, or not shared with ${email}`);
		const seen = await http(`${DRIVE}?${new URLSearchParams({ q: 'trashed = false', fields: 'files(id, name, mimeType)', pageSize: '20' })}`, auth);
		const visible = (await seen.json()).files;
		console.error(visible.length ? 'it can see:' : 'it can see nothing in Drive yet');
		for (const f of visible) console.error(`  ${f.name}  (${f.mimeType}, id ${f.id})`);
		return 1;
	}
	if (!res.ok) throw new Error(`folder lookup -> ${res.status} ${(await res.text()).slice(0, 300)}`);
	const folder = await res.json();
	const all = await listFolder(token);
	const files = briefingFiles(all);
	console.log(`folder "${folder.name}" (${FOLDER_ID}): ${all.length} files, ${files.length} briefings`);
	for (const f of files) console.log(`  ${f.name}  ${f.size} bytes  modified ${f.modifiedTime}`);
	return 0;
}

async function main() {
	const args = process.argv.slice(2);
	const mode = args[0] ?? 'ingest';

	if (mode === '--file') {
		const path = args[1];
		if (!path) throw new Error('usage: --file <briefing-YYYY-MM-DD.md>');
		const p = parseBriefing(readFileSync(path, 'utf8'), NAME.exec(basename(path))?.[1]);
		console.log(`${basename(path)}: ok, ${p.sections.length} sections, ${p.items.length} items`);
		return 0;
	}
	if (!['ingest', '--check', '--dry-run'].includes(mode)) throw new Error(`unknown option ${mode}`);

	const { token, email } = await accessToken();
	if (mode === '--check') return check(token, email);
	const files = briefingFiles(await listFolder(token));

	const done = ingestedFiles();
	const changed = files.filter((f) => done.get(f.name) !== f.md5Checksum);
	const entries = [];
	let failed = 0;
	for (const f of changed) {
		try {
			const parsed = parseBriefing(await download(token, f), NAME.exec(f.name)[1]);
			entries.push({ parsed, file: { name: f.name, id: f.id, md5: f.md5Checksum } });
			console.log(`${f.name}: ok, ${parsed.items.length} items`);
		} catch (e) {
			if (!(e instanceof FormatError)) throw e;
			failed++;
			console.error(`${f.name}: rejected: ${e.message}`);
		}
	}

	if (!entries.length) {
		console.log(changed.length ? 'nothing valid to ingest' : 'up to date');
	} else if (mode === '--dry-run') {
		console.log(`dry run: would ingest ${entries.length} file(s)`);
	} else {
		await commit(entries);
		console.log(`ingested ${entries.length} file(s)`);
	}
	return failed ? 1 : 0;
}

main().then(
	(code) => process.exit(code),
	(e) => {
		console.error(e instanceof Error ? e.message : e);
		process.exit(2);
	}
);

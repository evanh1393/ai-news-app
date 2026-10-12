import { error } from '@sveltejs/kit';

/** Offset pagination from a 1-based `?page=` param. Call `check` once the total is known. */
export function paginate(url: URL, size: number) {
	const raw = url.searchParams.get('page') ?? '1';
	const page = /^[1-9]\d*$/.test(raw) ? Number(raw) : NaN;
	if (!Number.isSafeInteger(page)) error(400, 'Invalid page');
	return {
		limit: size,
		offset: (page - 1) * size,
		/** Page info for <Pager>; 404s past the last page. */
		check(total: number) {
			const pages = Math.max(1, Math.ceil(total / size));
			if (page > pages) error(404, 'Page not found');
			return { page, pages };
		}
	};
}

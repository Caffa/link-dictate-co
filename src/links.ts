export interface FrequentLink {
	target: string;
	count: number;
}

function rankByCount(counts: Map<string, number>): FrequentLink[] {
	const entries = Array.from(counts.entries());
	entries.sort((a, b) => {
		if (b[1] !== a[1]) {
			return b[1] - a[1];
		}
		return a[0].localeCompare(b[0]);
	});

	return entries.map(([target, count]) => ({ target, count }));
}

export function frequentLinks(
	resolved: Record<string, Record<string, number>>,
	limit: number,
): FrequentLink[] {
	const counts = new Map<string, number>();

	for (const source of Object.values(resolved)) {
		for (const [target, count] of Object.entries(source)) {
			counts.set(target, (counts.get(target) ?? 0) + count);
		}
	}

	return rankByCount(counts).slice(0, limit);
}

function directoryOf(path: string): string {
	const slash = path.lastIndexOf('/');
	return slash === -1 ? '' : path.slice(0, slash);
}

export function sameFolderLinks(
	resolved: Record<string, Record<string, number>>,
	sourcePath: string,
	limit = 25,
): FrequentLink[] {
	const folder = directoryOf(sourcePath);
	const counts = new Map<string, number>();

	for (const [path, source] of Object.entries(resolved)) {
		if (path === sourcePath || directoryOf(path) !== folder) {
			continue;
		}
		for (const [target, count] of Object.entries(source)) {
			counts.set(target, (counts.get(target) ?? 0) + count);
		}
	}

	return rankByCount(counts).slice(0, limit);
}

export function currentNoteLinks(
	resolved: Record<string, Record<string, number>>,
	path: string,
): string[] {
	const source = resolved[path];
	if (!source) {
		return [];
	}

	const entries = Object.entries(source);
	entries.sort((a, b) => {
		if (b[1] !== a[1]) {
			return b[1] - a[1];
		}
		return a[0].localeCompare(b[0]);
	});

	return entries.map(([target]) => target);
}

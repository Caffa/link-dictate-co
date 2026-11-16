export interface FrequentLink {
	target: string;
	count: number;
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

	const entries = Array.from(counts.entries());
	entries.sort((a, b) => {
		if (b[1] !== a[1]) {
			return b[1] - a[1];
		}
		return a[0].localeCompare(b[0]);
	});

	return entries.slice(0, limit).map(([target, count]) => ({ target, count }));
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

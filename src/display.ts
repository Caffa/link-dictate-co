import type { FrequentLink } from './links';

export function basenameOfTarget(path: string): string {
	const withoutMd = path.endsWith('.md') ? path.slice(0, -3) : path;
	const slash = withoutMd.lastIndexOf('/');
	return slash === -1 ? withoutMd : withoutMd.slice(slash + 1);
}

export function parentDirOf(path: string): string {
	const withoutMd = path.endsWith('.md') ? path.slice(0, -3) : path;
	const slash = withoutMd.lastIndexOf('/');
	return slash === -1 ? '' : withoutMd.slice(0, slash);
}

export function parseLinkFilters(raw: string): string[] {
	return raw
		.split(',')
		.map((part) => part.trim())
		.filter((part) => part.length > 0)
		.map((part) => part.toLowerCase());
}

export function targetMatchesFilters(target: string, filters: string[]): boolean {
	if (filters.length === 0) return true;
	const haystack = target.toLowerCase();
	const basename = basenameOfTarget(target).toLowerCase();
	return filters.some((filter) => haystack.includes(filter) || basename.includes(filter));
}

export function extractUsedAliases(originals: string[]): Set<string> {
	const used = new Set<string>();
	for (const original of originals) {
		if (typeof original !== 'string') continue;
		const pipeIdx = original.indexOf('|');
		if (pipeIdx === -1) continue;
		const endIdx = original.lastIndexOf(']]');
		const rawAlias = endIdx === -1 ? original.slice(pipeIdx + 1) : original.slice(pipeIdx + 1, endIdx);
		const alias = rawAlias.trim();
		if (alias) {
			used.add(alias.toLowerCase());
		}
	}
	return used;
}

export function filterAliases(
	input: unknown[] | null | undefined,
	target: string,
	usedAliases?: Set<string>,
): string[] {
	if (!input) return [];
	const basename = basenameOfTarget(target).toLowerCase();
	const seen = new Set<string>();
	const out: string[] = [];
	for (const item of input) {
		if (item == null) continue;
		const alias = String(item).trim();
		if (!alias) continue;
		const key = alias.toLowerCase();
		if (key === basename || seen.has(key)) continue;
		if (usedAliases && !usedAliases.has(key)) continue;
		seen.add(key);
		out.push(alias);
	}
	return out;
}

export function groupCollisions(paths: string[]): Set<string> {
	const seen = new Map<string, string>();
	const collisions = new Set<string>();

	for (const path of paths) {
		const base = basenameOfTarget(path);
		if (seen.has(base)) {
			if (seen.get(base) !== path) {
				collisions.add(base);
			}
		} else {
			seen.set(base, path);
		}
	}

	return collisions;
}

export function insertTargetFor(target: string, collisions: Set<string>): string {
	const base = basenameOfTarget(target);
	if (!collisions.has(base)) return base;
	return target.endsWith('.md') ? target.slice(0, -3) : target;
}

export interface MergedRow {
	target: string;
	count: number;
	fromCurrent: boolean;
}

export function mergeCurrentAndFolderRows(
	currentTargets: string[],
	folderRows: FrequentLink[],
): MergedRow[] {
	const folderCount = new Map<string, number>();
	for (const { target, count } of folderRows) {
		folderCount.set(target, count);
	}

	const currentSet = new Set(currentTargets);
	const currentPart: MergedRow[] = currentTargets.map((target) => ({
		target,
		count: folderCount.get(target) ?? 0,
		fromCurrent: true,
	}));
	currentPart.sort((a, b) => {
		if (b.count !== a.count) {
			return b.count - a.count;
		}
		return basenameOfTarget(a.target).localeCompare(basenameOfTarget(b.target));
	});

	const folderOnly: MergedRow[] = folderRows
		.filter((row) => !currentSet.has(row.target))
		.map((row) => ({ target: row.target, count: row.count, fromCurrent: false }));

	return [...currentPart, ...folderOnly];
}

export function trimFilterFromBasename(basename: string, filters: string[]): string {
	if (filters.length === 0) return basename;
	const lower = basename.toLowerCase();
	let earliest = -1;
	let matchLen = 0;
	for (const filter of filters) {
		const idx = lower.indexOf(filter);
		if (idx === -1) continue;
		const take = idx < earliest || (idx === earliest && filter.length > matchLen);
		if (earliest === -1 || take) {
			earliest = idx;
			matchLen = filter.length;
		}
	}
	if (earliest === -1) return basename;

	let remainder = (basename.slice(0, earliest) + basename.slice(earliest + matchLen)).trim();
	remainder = remainder.replace(/^( - | -|-)\s*/, '');
	return remainder || basename;
}

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

export function filterAliases(input: unknown[] | null | undefined, target: string): string[] {
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

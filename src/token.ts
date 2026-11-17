export type InsertStyle = 'wikilink' | 'alias';

export function formatInsertToken(
	target: string,
	alias: string | null | undefined,
	style: InsertStyle,
	forceAlias = false,
): string {
	const t = target.trim();
	const a = alias?.trim();
	if (a && (forceAlias || style === 'alias')) {
		return `[[${t}|${a}]]`;
	}
	return `[[${t}]]`;
}

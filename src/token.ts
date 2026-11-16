export type InsertStyle = 'wikilink' | 'alias';

export function formatInsertToken(
	target: string,
	alias: string | null | undefined,
	style: InsertStyle,
): string {
	const t = target.trim();
	if (style === 'alias' && alias) {
		return `[[${t}|${alias.trim()}]]`;
	}
	return `[[${t}]]`;
}

export interface LinkDictateCoSettings {
	port: number;
	secret: string;
	insertStyle: 'wikilink' | 'alias';
}

export const DEFAULT_SETTINGS: LinkDictateCoSettings = {
	port: 48213,
	secret: '',
	insertStyle: 'wikilink',
};

export function mergeSettings(input: unknown): LinkDictateCoSettings {
	const out = { ...DEFAULT_SETTINGS };
	if (typeof input !== 'object' || input === null) {
		return out;
	}

	const raw = input as Record<string, unknown>;

	if ('port' in raw) {
		const parsed = parseInt(String(raw.port), 10);
		if (!Number.isNaN(parsed) && parsed > 0) {
			out.port = parsed;
		}
	}

	if ('secret' in raw && typeof raw.secret === 'string') {
		out.secret = raw.secret;
	}

	if ('insertStyle' in raw) {
		const style = String(raw.insertStyle);
		if (style === 'wikilink' || style === 'alias') {
			out.insertStyle = style;
		}
	}

	return out;
}

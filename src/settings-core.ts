export interface LinkDictateCoSettings {
	port: number;
	secret: string;
	insertStyle: 'wikilink' | 'alias';
	showCurrentNote: boolean;
	showSameFolder: boolean;
	showVaultWide: boolean;
	linkFilters: string;
	aliasMode: 'all' | 'used';
}

export const DEFAULT_SETTINGS: LinkDictateCoSettings = {
	port: 48213,
	secret: '',
	insertStyle: 'wikilink',
	showCurrentNote: true,
	showSameFolder: true,
	showVaultWide: true,
	linkFilters: '',
	aliasMode: 'used',
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

	for (const key of ['showCurrentNote', 'showSameFolder', 'showVaultWide'] as const) {
		if (key in raw && typeof raw[key] === 'boolean') {
			out[key] = raw[key];
		}
	}

	if ('linkFilters' in raw && typeof raw.linkFilters === 'string') {
		out.linkFilters = raw.linkFilters;
	} else {
		out.linkFilters = '';
	}

	if ('aliasMode' in raw) {
		const mode = String(raw.aliasMode);
		out.aliasMode = mode === 'all' || mode === 'used' ? mode : 'used';
	}

	return out;
}

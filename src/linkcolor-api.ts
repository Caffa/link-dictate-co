// Contract source: /Users/caffae/Notes/TestPlugin/.obsidian/plugins/links-coloring/README.md
// See section "Public API for other plugins" in the Link Colorer 2.1.0 README.
// This module is pure: no Obsidian imports, no host mutation.

export interface LinkColorerApi {
	version: 1;
	isReady(): boolean;
	getColorForLink(text: string): string | null;
	getColorsForLinks(texts: string[]): Record<string, string | null>;
	onRecolor?(cb: () => void | Promise<void>): () => void;
}

let lastAbsentLog = 0;
const ABSENT_LOG_THROTTLE_MS = 30_000;

export function throttledDebugMissingApi(): void {
	const now = Date.now();
	if (now - lastAbsentLog > ABSENT_LOG_THROTTLE_MS) {
		lastAbsentLog = now;
		console.debug('link-colorer API not available; skipping color integration');
	}
}

let lastInvalidLog = 0;
const INVALID_LOG_THROTTLE_MS = 30_000;

export function throttledDebugInvalidApi(): void {
	const now = Date.now();
	if (now - lastInvalidLog > INVALID_LOG_THROTTLE_MS) {
		lastInvalidLog = now;
		console.debug('link-colorer API candidate rejected; version or shape mismatch');
	}
}

export function asLinkColorerApi(candidate: unknown): LinkColorerApi | null {
	if (!candidate || typeof candidate !== 'object') return null;
	const api = candidate as Record<string, unknown>;
	if (api.version !== 1) return null;
	if (typeof api.isReady !== 'function') return null;
	if (typeof api.getColorForLink !== 'function') return null;
	if (typeof api.getColorsForLinks !== 'function') return null;
	if (api.onRecolor !== undefined && typeof api.onRecolor !== 'function') return null;
	return api as unknown as LinkColorerApi;
}

export function pickApi(
	pluginsRecord: Record<string, unknown> | undefined,
	win: { linkColorerApi?: unknown } | undefined,
): LinkColorerApi | null {
	let candidate: unknown;

	try {
		const pluginInstance = pluginsRecord?.['link-colorer'] as
			| { getApi?: () => unknown }
			| undefined;
		candidate = pluginInstance?.getApi?.();
	} catch {
		// fall through to window fallback
	}

	if (candidate === undefined || candidate === null) {
		candidate = win?.linkColorerApi;
	}

	return asLinkColorerApi(candidate);
}

export function safeGetColor(api: LinkColorerApi | null, text: string): string | null {
	if (!api || typeof text !== 'string' || text.trim().length === 0) return null;
	try {
		const color = api.getColorForLink(text);
		if (typeof color !== 'string' || !color.startsWith('#')) return null;
		return color;
	} catch {
		return null;
	}
}

export function styleForColor(color: string): string {
	return `color:${color} !important;-webkit-text-fill-color:${color} !important;--link-color:${color} !important;--link-external-color:${color} !important;`;
}

export function prepareLinkText(target: string): string {
	const withoutMd = target.length > 3 && target.endsWith('.md') ? target.slice(0, -3) : target;
	try {
		return decodeURIComponent(withoutMd);
	} catch {
		return withoutMd;
	}
}

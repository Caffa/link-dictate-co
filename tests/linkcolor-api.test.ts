import { describe, expect, it } from 'bun:test';
import {
	asLinkColorerApi,
	pickApi,
	prepareLinkText,
	safeGetColor,
	styleForColor,
	type LinkColorerApi,
} from '../src/linkcolor-api';

type MutableApi = Omit<LinkColorerApi, 'version'> & { version?: number };

function makeApi(overrides: Partial<MutableApi> = {}): LinkColorerApi {
	return {
		version: 1,
		isReady: () => true,
		getColorForLink: () => '#a1b2c3',
		getColorsForLinks: (texts) => Object.fromEntries(texts.map((t) => [t, '#a1b2c3'])),
		onRecolor: () => () => {},
		...overrides,
	} as LinkColorerApi;
}

describe('asLinkColorerApi', () => {
	it('accepts a valid api object', () => {
		const api = makeApi();
		expect(asLinkColorerApi(api)).toBe(api);
	});

	it('returns null for null', () => {
		expect(asLinkColorerApi(null)).toBeNull();
	});

	it('returns null for undefined', () => {
		expect(asLinkColorerApi(undefined)).toBeNull();
	});

	it('returns null for primitives', () => {
		expect(asLinkColorerApi('api')).toBeNull();
		expect(asLinkColorerApi(1)).toBeNull();
		expect(asLinkColorerApi(true)).toBeNull();
	});

	it('returns null when version is not 1', () => {
		expect(asLinkColorerApi(makeApi({ version: 2 }))).toBeNull();
	});

	it('returns null when version is missing', () => {
		const api = makeApi();
		delete (api as unknown as Record<string, unknown>).version;
		expect(asLinkColorerApi(api)).toBeNull();
	});

	it('returns null when isReady is missing', () => {
		const api = makeApi();
		delete (api as unknown as Record<string, unknown>).isReady;
		expect(asLinkColorerApi(api)).toBeNull();
	});

	it('returns null when isReady is not a function', () => {
		expect(asLinkColorerApi(makeApi({ isReady: true as unknown as () => boolean }))).toBeNull();
	});

	it('returns null when getColorForLink is missing', () => {
		const api = makeApi();
		delete (api as unknown as Record<string, unknown>).getColorForLink;
		expect(asLinkColorerApi(api)).toBeNull();
	});

	it('returns null when getColorForLink is not a function', () => {
		expect(asLinkColorerApi(makeApi({ getColorForLink: '#fff' as unknown as () => string }))).toBeNull();
	});

	it('returns null when getColorsForLinks is missing', () => {
		const api = makeApi();
		delete (api as unknown as Record<string, unknown>).getColorsForLinks;
		expect(asLinkColorerApi(api)).toBeNull();
	});

	it('returns null when getColorsForLinks is not a function', () => {
		expect(asLinkColorerApi(makeApi({ getColorsForLinks: {} as unknown as () => Record<string, string> }))).toBeNull();
	});

	it('returns null when onRecolor is present but not a function', () => {
		expect(asLinkColorerApi(makeApi({ onRecolor: 'nope' as unknown as () => () => void }))).toBeNull();
	});

	it('accepts an api without the optional onRecolor', () => {
		const api = makeApi();
		delete (api as unknown as Record<string, unknown>).onRecolor;
		expect(asLinkColorerApi(api)).toBe(api);
	});
});

describe('pickApi', () => {
	it('host api wins over window', () => {
		const hostApi = makeApi({ getColorForLink: () => '#host' });
		const windowApi = makeApi({ getColorForLink: () => '#window' });
		const pluginsRecord = {
			'link-colorer': { getApi: () => hostApi },
		};
		const result = pickApi(pluginsRecord, { linkColorerApi: windowApi });
		expect(result).toBe(hostApi);
		expect(result?.getColorForLink('x')).toBe('#host');
	});

	it('window fallback when host missing', () => {
		const windowApi = makeApi({ getColorForLink: () => '#window' });
		const result = pickApi({}, { linkColorerApi: windowApi });
		expect(result).toBe(windowApi);
	});

	it('rejects a host api with wrong version', () => {
		const hostApi = makeApi({ version: 2 });
		const pluginsRecord = {
			'link-colorer': { getApi: () => hostApi },
		};
		expect(pickApi(pluginsRecord, {})).toBeNull();
	});

	it('falls back to window when getApi throws', () => {
		const windowApi = makeApi({ getColorForLink: () => '#window' });
		const pluginsRecord = {
			'link-colorer': {
				getApi: () => {
					throw new Error('boom');
				},
			},
		};
		const result = pickApi(pluginsRecord, { linkColorerApi: windowApi });
		expect(result).toBe(windowApi);
	});

	it('returns null when both absent', () => {
		expect(pickApi({}, {})).toBeNull();
		expect(pickApi(undefined, undefined)).toBeNull();
	});
});

describe('safeGetColor', () => {
	it('returns the color from a ready api', () => {
		const api = makeApi({ getColorForLink: () => '#ff0000' });
		expect(safeGetColor(api, 'Target')).toBe('#ff0000');
	});

	it('returns null for a null api', () => {
		expect(safeGetColor(null, 'Target')).toBeNull();
	});

	it('returns null for empty or whitespace text', () => {
		const api = makeApi();
		expect(safeGetColor(api, '')).toBeNull();
		expect(safeGetColor(api, '   ')).toBeNull();
	});

	it('returns null when getColorForLink throws', () => {
		const api = makeApi({ getColorForLink: () => {
			throw new Error('boom');
		} });
		expect(safeGetColor(api, 'Target')).toBeNull();
	});

	it('returns null when getColorForLink returns null', () => {
		const api = makeApi({ getColorForLink: () => null });
		expect(safeGetColor(api, 'Target')).toBeNull();
	});

	it('returns null when getColorForLink returns a non-hex string', () => {
		const api = makeApi({ getColorForLink: () => 'red' });
		expect(safeGetColor(api, 'Target')).toBeNull();
	});

});

describe('styleForColor', () => {
	it('includes all four link-colorer CSS properties', () => {
		const style = styleForColor('#ff0000');
		expect(style).toContain('color:#ff0000 !important');
		expect(style).toContain('-webkit-text-fill-color:#ff0000 !important');
		expect(style).toContain('--link-color:#ff0000 !important');
		expect(style).toContain('--link-external-color:#ff0000 !important');
	});
});

describe('prepareLinkText', () => {
	it('strips the .md extension', () => {
		expect(prepareLinkText('Folder/Note.md')).toBe('Folder/Note');
	});

	it('leaves non-.md paths unchanged', () => {
		expect(prepareLinkText('Folder/Note')).toBe('Folder/Note');
	});

	it('decodes percent-encoded characters', () => {
		expect(prepareLinkText('Note%20with%20spaces.md')).toBe('Note with spaces');
	});

	it('keeps invalid percent sequences intact', () => {
		expect(prepareLinkText('Note%ZZ.md')).toBe('Note%ZZ');
	});

	it('does not alter short inputs ending in .md', () => {
		expect(prepareLinkText('.md')).toBe('.md');
	});
});

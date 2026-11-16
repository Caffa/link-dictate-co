import { describe, expect, it } from 'bun:test';
import { DEFAULT_SETTINGS, mergeSettings } from '../src/settings-core';

describe('mergeSettings', () => {
	it('returns defaults for empty input', () => {
		expect(mergeSettings({})).toEqual(DEFAULT_SETTINGS);
	});

	it('returns defaults for non-object input', () => {
		expect(mergeSettings(null)).toEqual(DEFAULT_SETTINGS);
		expect(mergeSettings('oops')).toEqual(DEFAULT_SETTINGS);
	});

	it('merges partial settings and drops unknown keys', () => {
		const result = mergeSettings({ port: '99999', secret: 'abc', extra: true });
		expect(result).toEqual({
			port: 99999,
			secret: 'abc',
			insertStyle: 'wikilink',
		});
		expect(result).not.toHaveProperty('extra');
	});

	it('reverts bad port to default', () => {
		expect(mergeSettings({ port: -5 }).port).toBe(DEFAULT_SETTINGS.port);
		expect(mergeSettings({ port: 'not-a-number' }).port).toBe(DEFAULT_SETTINGS.port);
		expect(mergeSettings({ port: 0 }).port).toBe(DEFAULT_SETTINGS.port);
	});

	it('coerces valid port strings', () => {
		expect(mergeSettings({ port: '12345' }).port).toBe(12345);
	});
});

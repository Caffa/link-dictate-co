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
			showCurrentNote: true,
			showSameFolder: true,
			showVaultWide: true,
			linkFilters: '',
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

	describe('panel section toggles', () => {
		it('defaults all panel toggles to true', () => {
			const result = mergeSettings({});
			expect(result.showCurrentNote).toBe(true);
			expect(result.showSameFolder).toBe(true);
			expect(result.showVaultWide).toBe(true);
		});

		it('preserves valid boolean panel toggles', () => {
			const result = mergeSettings({
				showCurrentNote: false,
				showSameFolder: false,
				showVaultWide: false,
			});
			expect(result.showCurrentNote).toBe(false);
			expect(result.showSameFolder).toBe(false);
			expect(result.showVaultWide).toBe(false);
		});

		it('coerces non-boolean panel toggles to true', () => {
			expect(mergeSettings({ showCurrentNote: 'yes' }).showCurrentNote).toBe(true);
			expect(mergeSettings({ showSameFolder: 1 }).showSameFolder).toBe(true);
			expect(mergeSettings({ showVaultWide: null }).showVaultWide).toBe(true);
			expect(mergeSettings({ showCurrentNote: undefined }).showCurrentNote).toBe(true);
		});
	});

	describe('linkFilters', () => {
		it('defaults to an empty string', () => {
			expect(mergeSettings({}).linkFilters).toBe('');
			expect(DEFAULT_SETTINGS.linkFilters).toBe('');
		});

		it('preserves a valid string', () => {
			expect(mergeSettings({ linkFilters: 'Char - , Worldbuilding/' }).linkFilters).toBe(
				'Char - , Worldbuilding/',
			);
		});

		it('coerces non-string values to an empty string', () => {
			expect(mergeSettings({ linkFilters: 123 }).linkFilters).toBe('');
			expect(mergeSettings({ linkFilters: true }).linkFilters).toBe('');
			expect(mergeSettings({ linkFilters: null }).linkFilters).toBe('');
			expect(mergeSettings({ linkFilters: ['Char - '] }).linkFilters).toBe('');
		});
	});
});

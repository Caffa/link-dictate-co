import { describe, expect, it } from 'bun:test';
import {
	shouldRefreshForLeafChange,
	VIEW_TYPE_LINK_DICTATE_CO,
} from '../src/refresh-guard';

describe('shouldRefreshForLeafChange', () => {
	it('returns false for the plugin view type', () => {
		expect(shouldRefreshForLeafChange(VIEW_TYPE_LINK_DICTATE_CO)).toBe(false);
	});

	it('returns true for markdown', () => {
		expect(shouldRefreshForLeafChange('markdown')).toBe(true);
	});

	it('returns true for empty string', () => {
		expect(shouldRefreshForLeafChange('')).toBe(true);
	});

	it('returns true for null', () => {
		expect(shouldRefreshForLeafChange(null)).toBe(true);
	});

	it('returns true for undefined', () => {
		expect(shouldRefreshForLeafChange(undefined)).toBe(true);
	});

	it('returns true for other view types', () => {
		expect(shouldRefreshForLeafChange('image')).toBe(true);
		expect(shouldRefreshForLeafChange('pdf')).toBe(true);
	});
});

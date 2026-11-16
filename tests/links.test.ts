import { describe, expect, it } from 'bun:test';
import { currentNoteLinks, frequentLinks, sameFolderLinks } from '../src/links';

describe('frequentLinks', () => {
	it('sums counts across sources', () => {
		const resolved = {
			'a.md': { Alpha: 1, Beta: 2 },
			'b.md': { Alpha: 2, Beta: 3, Gamma: 1 },
			'c.md': { Alpha: 3 },
		};
		expect(frequentLinks(resolved, 10)).toEqual([
			{ target: 'Alpha', count: 6 },
			{ target: 'Beta', count: 5 },
			{ target: 'Gamma', count: 1 },
		]);
	});

	it('sorts descending then alphabetically on ties', () => {
		const resolved = {
			'a.md': { Zeta: 1, Apple: 1 },
		};
		expect(frequentLinks(resolved, 10)).toEqual([
			{ target: 'Apple', count: 1 },
			{ target: 'Zeta', count: 1 },
		]);
	});

	it('respects the limit', () => {
		const resolved = {
			'a.md': { One: 1, Two: 1, Three: 1, Four: 1 },
		};
		expect(frequentLinks(resolved, 2)).toHaveLength(2);
	});

	it('returns empty array for empty map', () => {
		expect(frequentLinks({}, 10)).toEqual([]);
	});
});

describe('currentNoteLinks', () => {
	it('returns sorted links for the given path', () => {
		const resolved = {
			'note.md': { Beta: 2, Alpha: 1 },
		};
		expect(currentNoteLinks(resolved, 'note.md')).toEqual(['Beta', 'Alpha']);
	});

	it('returns empty array for unknown path', () => {
		expect(currentNoteLinks({ 'note.md': { Alpha: 1 } }, 'missing.md')).toEqual([]);
	});
});

describe('sameFolderLinks', () => {
	it('aggregates links across sources in the same directory', () => {
		const resolved = {
			'folder/a.md': { Alpha: 1, Beta: 2 },
			'folder/b.md': { Alpha: 2, Gamma: 1 },
			'other/c.md': { Alpha: 5, Delta: 1 },
		};
		expect(sameFolderLinks(resolved, 'folder/a.md', 10)).toEqual([
			{ target: 'Alpha', count: 3 },
			{ target: 'Beta', count: 2 },
			{ target: 'Gamma', count: 1 },
		]);
	});

	it('matches exact directory, not prefix', () => {
		const resolved = {
			'folder/a.md': { Alpha: 1 },
			'folder-sub/a.md': { Alpha: 5 },
		};
		expect(sameFolderLinks(resolved, 'folder/a.md', 10)).toEqual([
			{ target: 'Alpha', count: 1 },
		]);
	});

	it('uses root directory when path has no slash', () => {
		const resolved = {
			'root.md': { Alpha: 1 },
			'other.md': { Alpha: 5 },
			'folder/nested.md': { Alpha: 10 },
		};
		expect(sameFolderLinks(resolved, 'root.md', 10)).toEqual([
			{ target: 'Alpha', count: 6 },
		]);
	});

	it('sorts by count descending with alphabetical tiebreak', () => {
		const resolved = {
			'folder/a.md': { Zeta: 1, Apple: 1, Beta: 2 },
			'folder/b.md': { Apple: 1 },
		};
		expect(sameFolderLinks(resolved, 'folder/a.md', 10)).toEqual([
			{ target: 'Apple', count: 2 },
			{ target: 'Beta', count: 2 },
			{ target: 'Zeta', count: 1 },
		]);
	});

	it('respects the limit', () => {
		const resolved = {
			'folder/a.md': { One: 1, Two: 1, Three: 1, Four: 1 },
		};
		expect(sameFolderLinks(resolved, 'folder/a.md', 2)).toHaveLength(2);
	});

	it('returns empty array when folder has no links', () => {
		expect(sameFolderLinks({}, 'folder/note.md', 10)).toEqual([]);
	});
});

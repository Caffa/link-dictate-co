import { describe, expect, it } from 'bun:test';
import { currentNoteLinks, frequentLinks } from '../src/links';

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

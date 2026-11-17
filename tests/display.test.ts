import { describe, expect, it } from 'bun:test';
import {
	basenameOfTarget,
	filterAliases,
	groupCollisions,
	mergeCurrentAndFolderRows,
	parentDirOf,
	parseLinkFilters,
	targetMatchesFilters,
} from '../src/display';

describe('basenameOfTarget', () => {
	it('strips .md and returns the last segment', () => {
		expect(basenameOfTarget('Worldbuilding/Chars/Char - B.md')).toBe('Char - B');
	});

	it('handles nested paths without .md', () => {
		expect(basenameOfTarget('A/B/C/D')).toBe('D');
	});

	it('handles root-level files', () => {
		expect(basenameOfTarget('Note.md')).toBe('Note');
	});

	it('handles root-level files without extension', () => {
		expect(basenameOfTarget('Note')).toBe('Note');
	});
});

describe('parentDirOf', () => {
	it('returns the parent folder for a nested path', () => {
		expect(parentDirOf('Worldbuilding/Chars/Char - B.md')).toBe('Worldbuilding/Chars');
	});

	it('returns empty string for root-level files', () => {
		expect(parentDirOf('Note.md')).toBe('');
	});

	it('strips .md when computing parent', () => {
		expect(parentDirOf('Folder/Note.md')).toBe('Folder');
	});
});

describe('groupCollisions', () => {
	it('flags basenames that appear on more than one distinct path', () => {
		const paths = [
			'Worldbuilding/Chars/Char - B.md',
			'Worldbuilding/Places/Char - B.md',
			'Other/Unique.md',
		];
		expect(groupCollisions(paths)).toEqual(new Set(['Char - B']));
	});

	it('does not flag a single occurrence', () => {
		expect(groupCollisions(['Only/Note.md'])).toEqual(new Set());
	});

	it('does not flag same-name directories as collisions when the paths differ', () => {
		const paths = [
			'Worldbuilding/Chars/Char - B.md',
			'Worldbuilding/Places/Char - B.md',
			'Worldbuilding/Others/Char - B.md',
		];
		expect(groupCollisions(paths)).toEqual(new Set(['Char - B']));
	});

	it('uses exact basename match, not lowercase', () => {
		const paths = ['Folder/Foo.md', 'Folder/foo.md'];
		expect(groupCollisions(paths)).toEqual(new Set());
	});
});

describe('filterAliases', () => {
	it('returns aliases unchanged when none match the basename', () => {
		expect(filterAliases(['One', 'Two'], 'Note.md')).toEqual(['One', 'Two']);
	});

	it('skips an alias identical (case-insensitive) to the note basename', () => {
		expect(filterAliases(['note', 'Alias'], 'folder/Note.md')).toEqual(['Alias']);
	});

	it('dedupes aliases case-insensitively and keeps the first occurrence', () => {
		expect(filterAliases(['Alpha', 'alpha', 'Beta'], 'Note.md')).toEqual(['Alpha', 'Beta']);
	});

	it('drops empty or non-string aliases', () => {
		expect(filterAliases(['Ok', '', null, 'Ok'], 'Note.md')).toEqual(['Ok']);
	});
});

describe('parseLinkFilters', () => {
	it('splits on comma, trims, drops empties, and lowercases', () => {
		expect(parseLinkFilters('Char - , Worldbuilding/')).toEqual(['char -', 'worldbuilding/']);
	});

	it('returns an empty array for an empty string', () => {
		expect(parseLinkFilters('')).toEqual([]);
	});

	it('returns an empty array for a whitespace-only string', () => {
		expect(parseLinkFilters('   , ,  ')).toEqual([]);
	});

	it('handles a single filter', () => {
		expect(parseLinkFilters('Char - ')).toEqual(['char -']);
	});
});

describe('targetMatchesFilters', () => {
	it('returns true when empty filters', () => {
		expect(targetMatchesFilters('Worldbuilding/Chars/Char - B.md', [])).toBe(true);
	});

	it('matches case-insensitively on basename', () => {
		expect(targetMatchesFilters('Worldbuilding/Chars/Char - B.md', ['char -'])).toBe(true);
	});

	it('matches on full path', () => {
		expect(targetMatchesFilters('Worldbuilding/Chars/Char - B.md', ['worldbuilding/'])).toBe(true);
	});

	it('returns false when neither basename nor path matches', () => {
		expect(targetMatchesFilters('Worldbuilding/Chars/Char - B.md', ['places/'])).toBe(false);
	});

	it('matches any of multiple filters', () => {
		expect(targetMatchesFilters('Worldbuilding/Chars/Char - B.md', ['places/', 'char -'])).toBe(true);
	});
});

describe('mergeCurrentAndFolderRows', () => {
	it('puts current-note links first with folder counts, then folder-only links', () => {
		const current = ['Zeta.md', 'Alpha.md', 'Beta.md'];
		const folder = [
			{ target: 'Beta.md', count: 5 },
			{ target: 'Gamma.md', count: 4 },
			{ target: 'Alpha.md', count: 4 },
		];
		expect(mergeCurrentAndFolderRows(current, folder)).toEqual([
			{ target: 'Beta.md', count: 5, fromCurrent: true },
			{ target: 'Alpha.md', count: 4, fromCurrent: true },
			{ target: 'Zeta.md', count: 0, fromCurrent: true },
			{ target: 'Gamma.md', count: 4, fromCurrent: false },
		]);
	});

	it('sorts current-note links by folder count desc then basename alpha', () => {
		const current = ['B.md', 'A.md'];
		const folder = [
			{ target: 'A.md', count: 2 },
			{ target: 'B.md', count: 2 },
		];
		const result = mergeCurrentAndFolderRows(current, folder);
		expect(result.map((r) => r.target)).toEqual(['A.md', 'B.md']);
		expect(result.every((r) => r.fromCurrent)).toBe(true);
	});

	it('returns only folder rows when current list is empty', () => {
		const folder = [
			{ target: 'Beta.md', count: 2 },
			{ target: 'Alpha.md', count: 1 },
		];
		expect(mergeCurrentAndFolderRows([], folder)).toEqual([
			{ target: 'Beta.md', count: 2, fromCurrent: false },
			{ target: 'Alpha.md', count: 1, fromCurrent: false },
		]);
	});

	it('returns only current rows when folder list is empty', () => {
		expect(mergeCurrentAndFolderRows(['A.md', 'B.md'], [])).toEqual([
			{ target: 'A.md', count: 0, fromCurrent: true },
			{ target: 'B.md', count: 0, fromCurrent: true },
		]);
	});
});

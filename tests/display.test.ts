import { describe, expect, it } from 'bun:test';
import { basenameOfTarget, groupCollisions, parentDirOf } from '../src/display';

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

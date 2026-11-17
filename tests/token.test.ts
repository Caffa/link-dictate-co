import { describe, expect, it } from 'bun:test';
import { formatInsertToken } from '../src/token';

describe('formatInsertToken', () => {
	it('formats wikilink byte-exact as [[Foo]]', () => {
		expect(formatInsertToken('Foo', null, 'wikilink')).toBe('[[Foo]]');
	});

	it('formats alias as [[Foo|Bar]]', () => {
		expect(formatInsertToken('Foo', 'Bar', 'alias')).toBe('[[Foo|Bar]]');
	});

	it('falls back to wikilink when alias is null', () => {
		expect(formatInsertToken('Foo', null, 'alias')).toBe('[[Foo]]');
	});

	it('trims target and alias whitespace', () => {
		expect(formatInsertToken('  Foo  ', '  Bar  ', 'alias')).toBe('[[Foo|Bar]]');
		expect(formatInsertToken('  Foo  ', null, 'wikilink')).toBe('[[Foo]]');
	});

	it('forces alias form when forceAlias is true even in wikilink style', () => {
		expect(formatInsertToken('Foo', 'Bar', 'wikilink', true)).toBe('[[Foo|Bar]]');
	});

	it('falls back to wikilink when forceAlias is true but alias is null', () => {
		expect(formatInsertToken('Foo', null, 'wikilink', true)).toBe('[[Foo]]');
	});
});

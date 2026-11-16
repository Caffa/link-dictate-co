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
});

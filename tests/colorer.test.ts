import { describe, expect, it } from 'bun:test';
import {
	computeColor,
	hashDjb2,
	hashPhonetic,
	hashStrictAcronym,
	hashStrictFull,
	leastUsedSlot,
	normalizeForHash,
	PALETTES,
	styleForColor,
	stripPrefixOnce,
} from '../src/colorer';

const sampleSettings = {
	palette: 'vibrant' as const,
	ignorePrefix: true,
	hashMode: 'strict-full' as const,
	customSeed: 5381,
	darkSaturationMin: 70,
	darkSaturationMax: 90,
	darkLightnessMin: 60,
	darkLightnessMax: 75,
	lightSaturationMin: 70,
	lightSaturationMax: 90,
	lightLightnessMin: 35,
	lightLightnessMax: 45,
};

describe('normalizeForHash', () => {
	it('lowercases and trims', () => {
		expect(normalizeForHash('  Foo Bar  ', false)).toBe('foo bar');
	});

	it('strips a single prefix separator once, preserving later separators', () => {
		expect(normalizeForHash('InfoMap - Alternative input methods - Typing and Keyboards', true)).toBe(
			'alternative input methods - typing and keyboards',
		);
	});

	it('still reaches a clean suffix when one strip is enough', () => {
		expect(normalizeForHash('Worldbuilding/Chars/Char - B', true)).toBe('b');
	});

	it('strips a single separator layer when ignorePrefix is true', () => {
		expect(normalizeForHash('Chapter - Pamela', true)).toBe('pamela');
	});

	it('leaves text unchanged when ignorePrefix is false', () => {
		expect(normalizeForHash('Worldbuilding/Chars/Char - B', false)).toBe('worldbuilding/chars/char - b');
	});
});

describe('stripPrefixOnce', () => {
	it('returns null when no separator matches', () => {
		expect(stripPrefixOnce('plain')).toBeNull();
	});

	it('prefers the first separator in the list', () => {
		// Separator list begins with space-em-dash, space-hyphen, colon-space, etc.
		expect(stripPrefixOnce('A - B / C')).toBe('B / C');
	});
});

describe('hashDjb2', () => {
	it('is deterministic for the same input and seed', () => {
		expect(hashDjb2('hello', 123)).toBe(hashDjb2('hello', 123));
	});

	it('produces different outputs for different seeds', () => {
		expect(hashDjb2('hello', 1)).not.toBe(hashDjb2('hello', 2));
	});

	it('changes with input', () => {
		expect(hashDjb2('alpha', 5381)).not.toBe(hashDjb2('beta', 5381));
	});
});

describe('hashStrictFull', () => {
	it('differs from strict acronym', () => {
		const text = 'design system';
		expect(hashStrictFull(text, 5381)).not.toBe(hashStrictAcronym(text, 5381));
	});

	it('is deterministic', () => {
		expect(hashStrictFull('foo bar', 7)).toBe(hashStrictFull('foo bar', 7));
	});
});

describe('hashPhonetic', () => {
	it('is deterministic', () => {
		expect(hashPhonetic('sea', 10)).toBe(hashPhonetic('sea', 10));
	});

	it('gives similar hashes for similar-sounding words', () => {
		const see = hashPhonetic('see', 10);
		const sea = hashPhonetic('sea', 10);
		const diff = Math.abs(see - sea);
		// The phonetic hashes should be much closer than random words.
		expect(diff).toBeLessThan(1_000_000_000);
	});
});

describe('leastUsedSlot', () => {
	it('picks a valid slot on a fresh map', () => {
		const map = new Map<string, number>();
		const slot = leastUsedSlot(map, 5, 'vibrant', true, 5381, 8);
		expect(slot).toBeGreaterThanOrEqual(0);
		expect(slot).toBeLessThan(8);
	});

	it('avoids a used slot when another is free', () => {
		const map = new Map<string, number>();
		map.set('vibrant-random-dark-5381-5', 1);
		const slot = leastUsedSlot(map, 5, 'vibrant', true, 5381, 8);
		expect(slot).not.toBe(5);
	});

	it('increments the chosen slot', () => {
		const map = new Map<string, number>();
		const slot = leastUsedSlot(map, 0, 'vibrant', true, 5381, 8);
		expect(map.get(`vibrant-random-dark-5381-${slot}`)).toBe(1);
	});
});

describe('computeColor', () => {
	it('returns a hex color for valid input', () => {
		const map = new Map<string, number>();
		const color = computeColor('pamela', sampleSettings, true, map);
		expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
	});

	it('falls back to the vibrant palette for an unknown palette', () => {
		const map = new Map<string, number>();
		const vibrant = computeColor('x', sampleSettings, true, map);
		const map2 = new Map<string, number>();
		const fallback = computeColor('x', { ...sampleSettings, palette: 'missing' }, true, map2);
		expect(fallback).not.toBeNull();
		expect(fallback).toBe(vibrant);
	});

	it('uses the same color for the same input in the same context', () => {
		const a = computeColor('same', sampleSettings, true, new Map<string, number>());
		const b = computeColor('same', sampleSettings, true, new Map<string, number>());
		expect(a).toBe(b);
	});

	it('produces different dark/light colors for the same input', () => {
		const map = new Map<string, number>();
		const dark = computeColor('x', sampleSettings, true, map);
		const map2 = new Map<string, number>(map);
		const light = computeColor('x', sampleSettings, false, map2);
		expect(dark).not.toBe(light);
	});

	it('normalizes usage counts only within the active theme slot keys', () => {
		const darkOnly = new Map<string, number>();
		const withLightZeros = new Map<string, number>();
		for (let slot = 0; slot < 8; slot++) {
			const key = `vibrant-random-dark-5381-${slot}`;
			darkOnly.set(key, 55 + slot);
			withLightZeros.set(key, 55 + slot);
			withLightZeros.set(`vibrant-random-light-5381-${slot}`, 0);
		}
		const colorDarkOnly = computeColor('scoped', sampleSettings, true, darkOnly);
		const colorWithLightZeros = computeColor('scoped', sampleSettings, true, withLightZeros);
		// If normalization looked at every key, the light zeros would prevent
		// subtracting the dark baseline and the usage count would differ.
		expect(colorDarkOnly).toBe(colorWithLightZeros);
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

describe('PALETTES', () => {
	it('contains every palette with dark and light arrays', () => {
		for (const [name, def] of Object.entries(PALETTES)) {
			expect(def.dark.length).toBeGreaterThan(0);
			expect(def.light.length).toBeGreaterThan(0);
			expect(name).toBeTypeOf('string');
		}
	});
});

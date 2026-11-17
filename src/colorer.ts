import type { App } from 'obsidian';
import { PALETTES } from './colorer-palettes';
export { PALETTES } from './colorer-palettes';

export const SEPARATORS = [' — ', ' - ', ': ', ' | ', '/', '.'];

export const VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'y']);

export type HashMode = 'random' | 'strict-full' | 'strict-acronym' | 'phonetic-ipa';

export interface LinkColorerSettings {
	palette: string;
	ignorePrefix: boolean;
	hashMode: HashMode;
	customSeed: number;
	darkSaturationMin: number;
	darkSaturationMax: number;
	darkLightnessMin: number;
	darkLightnessMax: number;
	lightSaturationMin: number;
	lightSaturationMax: number;
	lightLightnessMin: number;
	lightLightnessMax: number;
}

export interface ColorContext {
	settings: LinkColorerSettings;
	isDark: boolean;
	usageMap: Map<string, number>;
	plugin: unknown;
}

// ---------------------------------------------------------------------------
// Pure helpers: normalization and hashing.
// ---------------------------------------------------------------------------
export function stripPrefixOnce(text: string): string | null {
	for (const sep of SEPARATORS) {
		const idx = text.indexOf(sep);
		if (idx !== -1) {
			const suffix = text.substring(idx + sep.length);
			if (suffix.length > 0) {
				return suffix.trim();
			}
		}
	}
	return null;
}

export function normalizeForHash(text: string, ignorePrefix: boolean): string {
	let current = text;
	if (ignorePrefix) {
		const stripped = stripPrefixOnce(current);
		if (stripped !== null) {
			current = stripped;
		}
	}
	return current.trim().toLowerCase();
}

export function hashDjb2(text: string, seed = 5381): number {
	let e = seed;
	for (let i = 0; i < text.length; i++) {
		e = (e << 5) + e + text.charCodeAt(i);
		e = e & e;
	}
	e ^= e >>> 16;
	e = Math.imul(e, 2246822507) >>> 0;
	e ^= e >>> 13;
	e = Math.imul(e, 3266489909) >>> 0;
	e ^= e >>> 16;
	return e >>> 0;
}

export function hashStrictFull(text: string, seed: number): number {
	const acronym = text
		.split(/\s+/)
		.filter(Boolean)
		.map((word) => word.charAt(0))
		.join('');
	return hashDjb2(`${acronym}${text}${text.length.toString()}`, seed);
}

export function hashStrictAcronym(text: string, seed: number): number {
	const acronym = text
		.split(/\s+/)
		.filter(Boolean)
		.map((word) => word.charAt(0))
		.join('');
	return hashDjb2(acronym, seed);
}

export function phoneticEncode(input: string): string {
	if (!input.length) return '';
	const out: string[] = [];
	let i = 0;
	const peek = (offset: number): string => input[i + offset] ?? '';
	const isVowel = (ch: string): boolean => VOWELS.has(ch);

	while (i < input.length) {
		const ch = input[i];
		if (ch === undefined) break;
		const lower = ch.toLowerCase();
		const next = peek(1);

		if (lower === 'c' && next === 'h') { out.push('C'); i += 2; continue; }
		if (lower === 's' && next === 'h') { out.push('S'); i += 2; continue; }
		if (lower === 't' && next === 'h') { out.push('D'); i += 2; continue; }
		if (lower === 'p' && next === 'h') { out.push('f'); i += 2; continue; }
		if (lower === 'q' && next === 'u') { out.push('k', 'w'); i += 2; continue; }
		if (lower === 'c' && next === 'k') { out.push('k'); i += 2; continue; }
		if (lower === 'n' && next === 'g') { out.push('N'); i += 2; continue; }
		if (lower === 'i' && next === 'g' && peek(2) === 'h') { out.push('I', String(input.length)); i += 3; continue; }
		if (lower === 'g' && next === 'h' && isVowel(peek(-1))) { out.push('f'); i += 2; continue; }
		if (lower === 'g' && next === 'h') { out.push('g'); i += 2; continue; }
		if (lower === 'e' && next === 'a') { out.push('i'); i += 2; continue; }
		if (lower === 'e' && next === 'e') { out.push('i'); i += 2; continue; }
		if (lower === 'o' && next === 'o') { out.push('u'); i += 2; continue; }
		if (lower === 'o' && next === 'a') { out.push('o'); i += 2; continue; }
		if (lower === 'c') { out.push(isVowel(next) && (next === 'e' || next === 'i' || next === 'y') ? 's' : 'k'); i++; continue; }
		if (lower === 'g') { out.push(isVowel(next) && (next === 'e' || next === 'i' || next === 'y') ? 'j' : 'g'); i++; continue; }
		if (lower === 'x') { out.push('k', 's'); i++; continue; }
		if (lower === 'y' && isVowel(peek(-1)) && !isVowel(next)) { out.push('i'); i++; continue; }
		if (lower === 'y' && (i === 0 || !isVowel(peek(-1)))) { out.push('j'); i++; continue; }
		if (isVowel(lower)) { out.push(lower); i++; continue; }
		if (lower >= 'a' && lower <= 'z') { out.push(lower); i++; continue; }
		out.push(lower);
		i++;
	}

	return out.join('');
}

export function hashPhonetic(text: string, seed: number): number {
	const encoded = text
		.trim()
		.toLowerCase()
		.split(/\s+/)
		.filter(Boolean)
		.map(phoneticEncode)
		.join('|');
	return hashDjb2(encoded || text, seed);
}

// ---------------------------------------------------------------------------
// Color math.
// ---------------------------------------------------------------------------
export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
	r /= 255;
	g /= 255;
	b /= 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	let h = 0;
	let s = 0;
	const l = (max + min) / 2;
	if (max !== min) {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
			case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
			case g: h = ((b - r) / d + 2) / 6; break;
			case b: h = ((r - g) / d + 4) / 6; break;
		}
	}
	return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
	h /= 360;
	s /= 100;
	l /= 100;
	let r: number;
	let g: number;
	let b: number;
	if (s === 0) {
		r = g = b = l;
	} else {
		const hue2rgb = (p: number, q1: number, t: number): number => {
			if (t < 0) t += 1;
			if (t > 1) t -= 1;
			if (t < 1 / 6) return p + (q1 - p) * 6 * t;
			if (t < 1 / 2) return q1;
			if (t < 2 / 3) return p + (q1 - p) * (2 / 3 - t) * 6;
			return p;
		};
		const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;
		r = hue2rgb(p, q, h + 1 / 3);
		g = hue2rgb(p, q, h);
		b = hue2rgb(p, q, h - 1 / 3);
	}
	return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
	const stripped = hex.replace('#', '');
	return {
		r: parseInt(stripped.substring(0, 2), 16),
		g: parseInt(stripped.substring(2, 4), 16),
		b: parseInt(stripped.substring(4, 6), 16),
	};
}

export function rgbToHex(r: number, g: number, b: number): string {
	const pad = (n: number): string => {
		const hex = n.toString(16);
		return hex.length === 1 ? `0${hex}` : hex;
	};
	return `#${pad(r)}${pad(g)}${pad(b)}`;
}

function usageKey(palette: string, isDark: boolean, seed: number, slot: number): string {
	return `${palette}-random-${isDark ? 'dark' : 'light'}-${seed}-${slot}`;
}

function normalizeUsageMap(
	map: Map<string, number>,
	palette: string,
	isDark: boolean,
	seed: number,
	slotCount: number,
): void {
	const threshold = 50;
	const activeKeys = new Set<string>();
	for (let slot = 0; slot < slotCount; slot++) {
		activeKeys.add(usageKey(palette, isDark, seed, slot));
	}

	let min = Number.MAX_SAFE_INTEGER;
	for (const key of map.keys()) {
		if (activeKeys.has(key)) {
			min = Math.min(min, map.get(key) ?? 0);
		}
	}

	if (min >= threshold) {
		for (const key of activeKeys) {
			const value = map.get(key);
			if (value !== undefined) {
				map.set(key, value - min);
			}
		}
	}
}

export function leastUsedSlot(
	usageMap: Map<string, number>,
	hash: number,
	palette: string,
	isDark: boolean,
	seed: number,
	slotCount: number,
): number {
	let start = hash % slotCount;
	let bestCount = Number.MAX_SAFE_INTEGER;
	const candidates: number[] = [];

	for (let offset = 0; offset < slotCount; offset++) {
		const slot = (start + offset) % slotCount;
		const key = usageKey(palette, isDark, seed, slot);
		const count = usageMap.get(key) ?? 0;
		if (count < bestCount) {
			bestCount = count;
			candidates.length = 0;
			candidates.push(slot);
		} else if (count === bestCount) {
			candidates.push(slot);
		}
	}

	let chosen: number;
	if (candidates.length === 1) {
		chosen = candidates[0]!;
	} else {
		const tieHash = hashDjb2(`${String(hash)}|${String(candidates.length)}`, seed);
		chosen = candidates[Math.abs(tieHash) % candidates.length]!;
	}

	const chosenKey = usageKey(palette, isDark, seed, chosen);
	usageMap.set(chosenKey, (usageMap.get(chosenKey) ?? 0) + 1);
	normalizeUsageMap(usageMap, palette, isDark, seed, slotCount);
	return chosen;
}

export function adjustColor(
	baseHex: string,
	variationHash: number,
	usageCount: number,
	isDark: boolean,
	settings: LinkColorerSettings,
): string {
	const { r, g, b } = hexToRgb(baseHex);
	const hsl = rgbToHsl(r, g, b);

	const u = (shift: number): number => Math.abs(((variationHash >> shift) ^ (variationHash << (shift % 13))) & 65535) / 65535;

	const cappedUsage = Math.min(usageCount, 6);
	const direction = cappedUsage % 2 === 0 ? 1 : -1;
	const hueStep = Math.ceil(cappedUsage / 2) * 15;
	const hueNoise = (u(3) - 0.5) * 20;
	const hueShift = Math.min(hueStep, 60) * direction;

	hsl.h = (hsl.h + hueShift + hueNoise + 360) % 360;

	if (isDark) {
		const satRange = settings.darkSaturationMax - settings.darkSaturationMin;
		const satNoise = (u(5) - 0.5) * (satRange * 0.3);
		hsl.s = Math.max(settings.darkSaturationMin, Math.min(settings.darkSaturationMax, hsl.s + satNoise));
		const lightRange = settings.darkLightnessMax - settings.darkLightnessMin;
		const lightMid = (settings.darkLightnessMin + settings.darkLightnessMax) / 2;
		const lightNoise = (u(7) - 0.5) * (lightRange * 0.2);
		hsl.l = Math.max(settings.darkLightnessMin, Math.min(settings.darkLightnessMax, lightMid + lightNoise));
	} else {
		const satRange = settings.lightSaturationMax - settings.lightSaturationMin;
		const satNoise = (u(5) - 0.5) * (satRange * 0.3);
		hsl.s = Math.max(settings.lightSaturationMin, Math.min(settings.lightSaturationMax, hsl.s + satNoise));
		const lightRange = settings.lightLightnessMax - settings.lightLightnessMin;
		const lightMid = (settings.lightLightnessMin + settings.lightLightnessMax) / 2;
		const lightNoise = (u(7) - 0.5) * (lightRange * 0.3);
		hsl.l = Math.max(settings.lightLightnessMin, Math.min(settings.lightLightnessMax, lightMid + lightNoise));
	}

	const rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
	return rgbToHex(rgb.r, rgb.g, rgb.b);
}

export function computeColor(
	text: string,
	settings: LinkColorerSettings,
	isDark: boolean,
	usageMap: Map<string, number>,
): string | null {
	const paletteDef = PALETTES[settings.palette] ?? PALETTES.vibrant;
	if (!paletteDef) return null;

	const hashMode: HashMode = settings.hashMode;
	const seed = settings.customSeed;
	const normalized = normalizeForHash(text, settings.ignorePrefix);

	let hash: number;
	if (hashMode === 'random') {
		hash = hashDjb2(normalized, seed);
	} else {
		switch (hashMode) {
			case 'strict-full': hash = hashStrictFull(normalized, seed); break;
			case 'strict-acronym': hash = hashStrictAcronym(normalized, seed); break;
			case 'phonetic-ipa': hash = hashPhonetic(normalized, seed); break;
			default: hash = hashStrictFull(normalized, seed); break;
		}
	}

	const palette = isDark ? paletteDef.dark : paletteDef.light;
	const slot = leastUsedSlot(usageMap, hash, settings.palette, isDark, seed, palette.length);
	const base = palette[slot]!;
	const usageCount = usageMap.get(usageKey(settings.palette, isDark, seed, slot)) ?? 0;
	const variationHash = hashDjb2(`${normalized}|v`, seed);
	return adjustColor(base, variationHash, usageCount, isDark, settings);
}

export function styleForColor(color: string): string {
	return `color:${color} !important;-webkit-text-fill-color:${color} !important;--link-color:${color} !important;--link-external-color:${color} !important;`;
}

// ---------------------------------------------------------------------------
// Live plugin integration.
// ---------------------------------------------------------------------------
export function getLinkColorer(app: App): unknown | null {
	try {
		const plugins = (app as unknown as Record<string, unknown>).plugins as Record<string, unknown> | undefined;
		if (!plugins || typeof plugins !== 'object') return null;
		const instance = plugins['link-colorer'];
		if (!instance || typeof instance !== 'object') return null;
		return instance;
	} catch {
		return null;
	}
}

const ALLOWED_HASH_MODES: HashMode[] = ['random', 'strict-full', 'strict-acronym', 'phonetic-ipa'];

function isValidNumber(value: unknown): value is number {
	return typeof value === 'number' && !Number.isNaN(value);
}

function validateSettings(raw: unknown): LinkColorerSettings | null {
	if (!raw || typeof raw !== 'object') return null;
	const s = raw as Record<string, unknown>;
	if (typeof s.palette !== 'string' || !PALETTES[s.palette]) return null;
	if (typeof s.hashMode !== 'string' || !ALLOWED_HASH_MODES.includes(s.hashMode as HashMode)) return null;
	if (!isValidNumber(s.customSeed)) return null;
	const numericFields = [
		'darkSaturationMin', 'darkSaturationMax', 'darkLightnessMin', 'darkLightnessMax',
		'lightSaturationMin', 'lightSaturationMax', 'lightLightnessMin', 'lightLightnessMax',
	];
	for (const key of numericFields) {
		if (!isValidNumber(s[key])) return null;
	}
	return s as unknown as LinkColorerSettings;
}

function cloneUsageMap(input: unknown): Map<string, number> {
	if (input instanceof Map) {
		return new Map(input.entries());
	}
	return new Map();
}

export function prepareColorContext(app: App): ColorContext | null {
	const plugin = getLinkColorer(app);
	if (!plugin) return null;

	try {
		const settings = validateSettings((plugin as Record<string, unknown>).settings);
		if (!settings) return null;

		const isDark = typeof document !== 'undefined' && document.body.classList.contains('theme-dark');

		let usageMap: Map<string, number> = new Map();
		const instance = plugin as Record<string, unknown>;
		const accessor =
			typeof instance.getColorUsageStats === 'function'
				? instance.getColorUsageStats
				: typeof instance.getColorUsageMap === 'function'
					? instance.getColorUsageMap
					: null;
		if (accessor) {
			const raw = accessor.call(instance);
			if (raw instanceof Map) {
				usageMap = cloneUsageMap(raw);
			}
		} else {
			console.debug('link-colorer instance found but exposes no usage accessor');
		}

		return { settings, isDark, usageMap, plugin };
	} catch {
		return null;
	}
}

export function colorForTarget(target: string, ctx: ColorContext | null): string | null {
	if (!ctx) return null;
	try {
		let path = target.endsWith('.md') ? target.slice(0, -3) : target;
		try {
			path = decodeURIComponent(path);
		} catch {
			// leave path as-is if decoding fails
		}
		return computeColor(path, ctx.settings, ctx.isDark, ctx.usageMap);
	} catch {
		return null;
	}
}

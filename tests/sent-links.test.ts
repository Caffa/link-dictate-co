import { describe, expect, it } from 'bun:test';
import { SentLinksTracker } from '../src/sent-links';

describe('SentLinksTracker', () => {
	it('adds and lists tokens in order', () => {
		const tracker = new SentLinksTracker();
		tracker.add('[[A]]');
		tracker.add('[[B]]');
		expect(tracker.list()).toEqual([
			{ token: '[[A]]', at: expect.any(Number) },
			{ token: '[[B]]', at: expect.any(Number) },
		]);
	});

	it('drops oldest when cap exceeded', () => {
		const tracker = new SentLinksTracker(3);
		tracker.add('[[A]]');
		tracker.add('[[B]]');
		tracker.add('[[C]]');
		tracker.add('[[D]]');
		expect(tracker.list().map((l) => l.token)).toEqual(['[[B]]', '[[C]]', '[[D]]']);
	});

	it('clears all entries', () => {
		const tracker = new SentLinksTracker();
		tracker.add('[[A]]');
		tracker.clear();
		expect(tracker.list()).toEqual([]);
	});
});

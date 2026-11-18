import { describe, expect, it } from 'bun:test';
import { PendingLinksTracker } from '../src/pending-links';

async function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('PendingLinksTracker', () => {
	it('adds and lists tokens in order', () => {
		const tracker = new PendingLinksTracker();
		tracker.add('[[A]]');
		tracker.add('[[B]]');
		expect(tracker.list()).toEqual([
			{ token: '[[A]]', at: expect.any(Number) },
			{ token: '[[B]]', at: expect.any(Number) },
		]);
	});

	it('returns copies from list', () => {
		const tracker = new PendingLinksTracker();
		tracker.add('[[A]]');
		const list = tracker.list();
		list.pop();
		expect(tracker.list()).toHaveLength(1);
	});

	it('drops oldest when cap exceeded', () => {
		const tracker = new PendingLinksTracker(3);
		tracker.add('[[A]]');
		tracker.add('[[B]]');
		tracker.add('[[C]]');
		tracker.add('[[D]]');
		expect(tracker.list().map((l) => l.token)).toEqual(['[[B]]', '[[C]]', '[[D]]']);
	});

	it('default cap 5 drops oldest on overflow', () => {
		const tracker = new PendingLinksTracker();
		tracker.add('[[1]]');
		tracker.add('[[2]]');
		tracker.add('[[3]]');
		tracker.add('[[4]]');
		tracker.add('[[5]]');
		tracker.add('[[6]]');
		expect(tracker.list().map((l) => l.token)).toEqual([
			'[[2]]',
			'[[3]]',
			'[[4]]',
			'[[5]]',
			'[[6]]',
		]);
	});

	it('prunes only expired entries', async () => {
		const tracker = new PendingLinksTracker();
		tracker.add('[[A]]');
		await sleep(5);
		tracker.add('[[B]]');
		const links = tracker.list();
		const expired = tracker.pruneExpired(links[1]!.at - 1, 2);
		expect(expired.map((l) => l.token)).toEqual(['[[A]]']);
		expect(tracker.list().map((l) => l.token)).toEqual(['[[B]]']);
	});

	it('returns empty array and does not throw when pruning empty list', () => {
		const tracker = new PendingLinksTracker();
		expect(tracker.pruneExpired(Date.now(), 60000)).toEqual([]);
		expect(tracker.list()).toEqual([]);
	});

	it('preserves FIFO order for non-expired entries', () => {
		const tracker = new PendingLinksTracker();
		tracker.add('[[A]]');
		tracker.add('[[B]]');
		tracker.add('[[C]]');
		const now = Date.now();
		const expired = tracker.pruneExpired(now + 1000, 2000);
		expect(expired).toEqual([]);
		expect(tracker.list().map((l) => l.token)).toEqual([
			'[[A]]',
			'[[B]]',
			'[[C]]',
		]);
	});

	it('clear empties the tracker', () => {
		const tracker = new PendingLinksTracker();
		tracker.add('[[A]]');
		tracker.clear();
		expect(tracker.list()).toEqual([]);
	});

	it('removes a specific token by token and at', () => {
		const tracker = new PendingLinksTracker();
		tracker.add('[[A]]');
		tracker.add('[[B]]');
		const bAt = tracker.list()[1]!.at;
		expect(tracker.remove('[[B]]', bAt)).toBe(true);
		expect(tracker.list().map((l) => l.token)).toEqual(['[[A]]']);
	});

	it('remove returns false for unknown token', () => {
		const tracker = new PendingLinksTracker();
		tracker.add('[[A]]');
		expect(tracker.remove('[[B]]', Date.now())).toBe(false);
		expect(tracker.list().map((l) => l.token)).toEqual(['[[A]]']);
	});
});

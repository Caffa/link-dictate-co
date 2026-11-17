import { describe, expect, it } from 'bun:test';
import { EditorFocusTracker } from '../src/editor-focus';

function makeMarkdownLeaf(focus = () => {}) {
	return {
		view: {
			getViewType: () => 'markdown',
			editor: { focus },
		},
	};
}

function makeEmptyLeaf() {
	return {
		view: {
			getViewType: () => 'empty',
			editor: { focus: () => {} },
		},
	};
}

describe('EditorFocusTracker', () => {
	it('tracks a markdown-shaped leaf', () => {
		const tracker = new EditorFocusTracker();
		const focus = () => {};
		tracker.tryTrack(makeMarkdownLeaf(focus));
		expect(tracker.refocus()).toBe(true);
	});

	it('ignores non-markdown views', () => {
		const tracker = new EditorFocusTracker();
		tracker.tryTrack(makeEmptyLeaf());
		expect(tracker.refocus()).toBe(false);
	});

	it('ignores leaves without an editor', () => {
		const tracker = new EditorFocusTracker();
		tracker.tryTrack({ view: { getViewType: () => 'markdown' } });
		expect(tracker.refocus()).toBe(false);
	});

	it('latest wins and overwrites previous', () => {
		const tracker = new EditorFocusTracker();
		let firstFocused = false;
		let secondFocused = false;
		tracker.tryTrack(
			makeMarkdownLeaf(() => {
				firstFocused = true;
			}),
		);
		tracker.tryTrack(
			makeMarkdownLeaf(() => {
				secondFocused = true;
			}),
		);
		expect(tracker.refocus()).toBe(true);
		expect(secondFocused).toBe(true);
		expect(firstFocused).toBe(false);
	});

	it('does not throw when tryTrack receives null', () => {
		const tracker = new EditorFocusTracker();
		expect(() => tracker.tryTrack(null)).not.toThrow();
		expect(tracker.refocus()).toBe(false);
	});

	it('refocus returns false when nothing tracked', () => {
		const tracker = new EditorFocusTracker();
		expect(tracker.refocus()).toBe(false);
	});

	it('refocus returns false when focus throws', () => {
		const tracker = new EditorFocusTracker();
		tracker.tryTrack(
			makeMarkdownLeaf(() => {
				throw new Error('stale editor');
			}),
		);
		expect(tracker.refocus()).toBe(false);
	});
});

export interface FocusableLeaf {
	view?: unknown;
}

export class EditorFocusTracker {
	private lastView: { editor?: { focus: () => void } } | null = null;

	tryTrack(leaf: unknown): void {
		if (!leaf) return;
		const view = (leaf as FocusableLeaf).view;
		if (!view) return;
		const viewType = (view as { getViewType?: () => string }).getViewType?.();
		if (viewType !== 'markdown') return;
		const editor = (view as { editor?: { focus?: () => void } }).editor;
		if (typeof editor?.focus !== 'function') return;
		this.lastView = view as { editor: { focus: () => void } };
	}

	refocus(): boolean {
		if (!this.lastView?.editor?.focus) return false;
		try {
			this.lastView.editor.focus();
			return true;
		} catch {
			return false;
		}
	}
}

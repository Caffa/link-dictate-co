import {
	EventRef,
	Notice,
	Plugin,
	WorkspaceLeaf,
} from 'obsidian';
import {
	DEFAULT_SETTINGS,
	mergeSettings,
	type LinkDictateCoSettings,
} from './settings-core';
import { LinkDictateCoSettingTab } from './settings';
import { LinkDictateCoView } from './view';
import { EditorFocusTracker } from './editor-focus';
import { SentLinksTracker } from './sent-links';
import { PendingLinksTracker } from './pending-links';
import {
	shouldRefreshForLeafChange,
	VIEW_TYPE_LINK_DICTATE_CO,
} from './refresh-guard';
import { HandyClient } from './handy-client';
import { requestUrlTransport } from './transport';

declare module 'obsidian' {
	interface Workspace {
		on(name: 'link-colorer:recolor', callback: () => any, ctx?: any): EventRef;
	}
}

const REFRESH_DEBOUNCE_MS = 2000;
const PENDING_TTL_MS = 60000;

export default class LinkDictateCoPlugin extends Plugin {
	settings: LinkDictateCoSettings = { ...DEFAULT_SETTINGS };
	editorFocus = new EditorFocusTracker();
	sentLinks = new SentLinksTracker();
	pendingLinks = new PendingLinksTracker();
	private refreshTimer?: number;
	private drainingPending = false;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.registerView(
			VIEW_TYPE_LINK_DICTATE_CO,
			(leaf: WorkspaceLeaf) => new LinkDictateCoView(leaf, this),
		);

		this.addRibbonIcon('mic', 'Link Dictate Co', () => {
			void this.activateView();
		});

		this.addCommand({
			id: 'open-panel',
			name: 'Open panel',
			callback: () => {
				void this.activateView();
			},
		});

		this.addSettingTab(new LinkDictateCoSettingTab(this.app, this));

		this.registerEvent(
			this.app.metadataCache.on('resolved', () => this.debouncedRefresh()),
		);
		this.registerEvent(
			this.app.metadataCache.on('changed', () => this.debouncedRefresh()),
		);
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', (leaf) => {
				if (!leaf) return;
				const view = (leaf as { view?: { getViewType?: () => string } }).view;
				const vt = view?.getViewType?.() ?? null;
				if (!shouldRefreshForLeafChange(vt)) return;
				this.refreshView(true);
			}),
		);
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', (leaf) => this.editorFocus.tryTrack(leaf)),
		);
		// README: "Consumers should refresh on the `link-colorer:recolor` workspace event."
		this.registerEvent(
			this.app.workspace.on('link-colorer:recolor', () => this.refreshView()),
		);
		this.registerEvent(
			this.app.workspace.on('css-change', () => this.refreshView()),
		);
	}

	onunload(): void {
		if (this.refreshTimer) {
			window.clearTimeout(this.refreshTimer);
			this.refreshTimer = undefined;
		}
	}

	async loadSettings(): Promise<void> {
		this.settings = mergeSettings(await this.loadData());
	}

	private debouncedRefresh(): void {
		if (this.refreshTimer) {
			window.clearTimeout(this.refreshTimer);
		}
		this.refreshTimer = window.setTimeout(() => {
			this.refreshTimer = undefined;
			this.refreshView();
		}, REFRESH_DEBOUNCE_MS);
	}

	refreshView(currentOnly = false): void {
		const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_LINK_DICTATE_CO);
		for (const leaf of leaves) {
			const view = leaf.view;
			if (view instanceof LinkDictateCoView) {
				view.refresh(currentOnly);
			}
		}
	}

	showHandyNotice(result: 'unauthorized' | 'buffer_full' | 'error'): void {
		switch (result) {
			case 'unauthorized':
				new Notice('Handy rejected the secret');
				break;
			case 'buffer_full':
				new Notice("Handy's token buffer is full");
				break;
			case 'error':
			default:
				new Notice('Handy unreachable');
				break;
		}
	}

	async drainPendingLinks(): Promise<void> {
		if (this.drainingPending) return;
		this.drainingPending = true;
		try {
			const now = Date.now();
			this.pendingLinks.pruneExpired(now, PENDING_TTL_MS);

			const state = await this.handyClient().state();
			if (state !== 'recording') return;

			const pending = this.pendingLinks.list();
			for (const link of pending) {
				// Refocus before each insert so drained tokens land in the editor.
				this.editorFocus.refocus();
				const result = await this.handyClient().insert(link.token);
				switch (result) {
					case 'ok':
						this.sentLinks.add(link.token);
						this.pendingLinks.remove(link.token, link.at);
						break;
					case 'unauthorized':
						this.pendingLinks.remove(link.token, link.at);
						this.showHandyNotice('unauthorized');
						break;
					case 'buffer_full':
						this.pendingLinks.remove(link.token, link.at);
						this.showHandyNotice('buffer_full');
						break;
					case 'not_recording':
					case 'error':
					default:
						// Leave it in the queue; retry next poll.
						break;
				}
			}
		} finally {
			this.drainingPending = false;
		}
	}

	private handyClient(): HandyClient {
		return new HandyClient(
			this.settings.port,
			this.settings.secret,
			requestUrlTransport,
		);
	}

	private async activateView(): Promise<void> {
		const { workspace } = this.app;
		let leaf = workspace.getRightLeaf(false);
		if (!leaf) {
			leaf = workspace.getLeaf('tab');
		}
		await leaf.setViewState({ type: VIEW_TYPE_LINK_DICTATE_CO, active: true });
		workspace.revealLeaf(leaf);
	}
}

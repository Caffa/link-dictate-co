import {
	Plugin,
	WorkspaceLeaf,
} from 'obsidian';
import {
	DEFAULT_SETTINGS,
	mergeSettings,
	type LinkDictateCoSettings,
} from './settings-core';
import { LinkDictateCoSettingTab } from './settings';
import { LinkDictateCoView, VIEW_TYPE_LINK_DICTATE_CO } from './view';

const REFRESH_DEBOUNCE_MS = 2000;

export default class LinkDictateCoPlugin extends Plugin {
	settings: LinkDictateCoSettings = { ...DEFAULT_SETTINGS };
	private refreshTimer?: number;

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
			this.app.workspace.on('active-leaf-change', () => this.refreshView(true)),
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

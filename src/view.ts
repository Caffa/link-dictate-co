import {
	ItemView,
	Notice,
	WorkspaceLeaf,
} from 'obsidian';
import type LinkDictateCoPlugin from './plugin';
import { HandyClient } from './handy-client';
import { requestUrlTransport } from './transport';
import { currentNoteLinks, frequentLinks, sameFolderLinks, type FrequentLink } from './links';
import { formatInsertToken } from './token';

export const VIEW_TYPE_LINK_DICTATE_CO = 'link-dictate-co';

const VAULT_LINK_LIMIT = 25;
const POLL_INTERVAL_MS = 2000;

export class LinkDictateCoView extends ItemView {
	plugin: LinkDictateCoPlugin;
	rootEl: HTMLElement;
	statusEl: HTMLElement;
	currentSectionEl: HTMLElement;
	sameFolderSectionEl: HTMLElement;
	vaultSectionEl: HTMLElement;
	emptyHintEl: HTMLElement;
	pollTimer?: number;
	private currentHasLinks = false;
	private sameFolderHasLinks = false;
	private vaultHasLinks = false;

	constructor(leaf: WorkspaceLeaf, plugin: LinkDictateCoPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.rootEl = this.contentEl.createDiv({ cls: 'link-dictate-co-container' });
		this.statusEl = this.rootEl.createDiv({ cls: 'link-dictate-co-status ldc-idle' });
		this.currentSectionEl = this.rootEl.createDiv({ cls: 'link-dictate-co-section' });
		this.sameFolderSectionEl = this.rootEl.createDiv({ cls: 'link-dictate-co-section' });
		this.vaultSectionEl = this.rootEl.createDiv({ cls: 'link-dictate-co-section' });
		this.emptyHintEl = this.rootEl.createDiv({
			cls: 'link-dictate-co-empty link-dictate-co-global-hint',
			text: 'No links yet',
		});
	}

	getViewType(): string {
		return VIEW_TYPE_LINK_DICTATE_CO;
	}

	getDisplayText(): string {
		return 'Link Dictate Co';
	}

	async onOpen(): Promise<void> {
		this.refresh();
		this.pollTimer = window.setInterval(() => {
			void this.pollState();
		}, POLL_INTERVAL_MS);
		void this.pollState();
	}

	async onClose(): Promise<void> {
		if (this.pollTimer) {
			window.clearInterval(this.pollTimer);
			this.pollTimer = undefined;
		}
	}

	private handyClient(): HandyClient {
		return new HandyClient(
			this.plugin.settings.port,
			this.plugin.settings.secret,
			requestUrlTransport,
		);
	}

	async pollState(): Promise<void> {
		const state = await this.handyClient().state();
		this.statusEl.removeClasses(['ldc-idle', 'ldc-recording']);

		switch (state) {
			case 'recording':
				this.statusEl.addClass('ldc-recording');
				this.statusEl.setText('Recording');
				break;
			case 'unauthorized':
				this.statusEl.addClass('ldc-idle');
				this.statusEl.setText('Unauthorized — check secret');
				break;
			case 'down':
				this.statusEl.addClass('ldc-idle');
				this.statusEl.setText('Handy unreachable');
				break;
			default:
				this.statusEl.addClass('ldc-idle');
				this.statusEl.setText('Idle');
		}
	}

	refresh(currentOnly = false): void {
		const resolved = this.app.metadataCache.resolvedLinks as Record<
			string,
			Record<string, number>
		>;
		const activeFile = this.app.workspace.getActiveFile();

		const currentPath = activeFile?.path ?? '';
		const { settings } = this.plugin;

		this.currentHasLinks = this.renderSection(
			this.currentSectionEl,
			settings.showCurrentNote,
			'Current note',
			currentNoteLinks(resolved, currentPath),
			false,
		);

		const sameFolder = settings.showSameFolder
			? sameFolderLinks(resolved, currentPath, VAULT_LINK_LIMIT)
			: [];
		this.sameFolderHasLinks = this.renderSection(
			this.sameFolderSectionEl,
			settings.showSameFolder,
			'Same folder',
			sameFolder.map((link) => link.target),
			true,
			sameFolder,
		);

		if (!currentOnly) {
			const frequent = settings.showVaultWide
				? frequentLinks(resolved, VAULT_LINK_LIMIT)
				: [];
			this.vaultHasLinks = this.renderSection(
				this.vaultSectionEl,
				settings.showVaultWide,
				'Vault-wide frequent links',
				frequent.map((link) => link.target),
				true,
				frequent,
			);
		}

		this.updateEmptyHint();
	}

	private updateEmptyHint(): void {
		const { settings } = this.plugin;
		const enabledSections = [
			settings.showCurrentNote,
			settings.showSameFolder,
			settings.showVaultWide,
		].filter(Boolean).length;
		const hasLinks =
			(settings.showCurrentNote && this.currentHasLinks) ||
			(settings.showSameFolder && this.sameFolderHasLinks) ||
			(settings.showVaultWide && this.vaultHasLinks);
		this.emptyHintEl.style.display = enabledSections > 0 && !hasLinks ? '' : 'none';
	}

	private renderSection(
		section: HTMLElement,
		enabled: boolean,
		title: string,
		targets: string[],
		showCounts: boolean,
		counts?: FrequentLink[],
	): boolean {
		section.empty();
		if (!enabled) {
			section.style.display = 'none';
			return false;
		}
		section.style.display = '';
		section.createDiv({
			cls: 'link-dictate-co-section-title',
			text: title,
		});

		const list = section.createDiv({ cls: 'link-dictate-co-list' });

		if (targets.length === 0) {
			list.createDiv({
				cls: 'link-dictate-co-empty',
				text: 'No links available',
			});
			return false;
		}

		for (const target of targets) {
			const row = list.createDiv({ cls: 'link-dictate-co-row' });
			row.createSpan({ cls: 'link-dictate-co-target', text: target });

			if (showCounts && counts) {
				const count = counts.find((c) => c.target === target)?.count ?? 0;
				row.createSpan({ cls: 'link-dictate-co-count', text: String(count) });
			}

			row.addEventListener('click', () => {
				void this.handleInsert(target);
			});
		}

		return true;
	}

	private async handleInsert(target: string): Promise<void> {
		const token = formatInsertToken(target, null, this.plugin.settings.insertStyle);
		const result = await this.handyClient().insert(token);

		switch (result) {
			case 'ok':
				break;
			case 'not_recording':
				new Notice("Handy isn't recording");
				break;
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
}

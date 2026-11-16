import {
	ItemView,
	Notice,
	WorkspaceLeaf,
} from 'obsidian';
import type LinkDictateCoPlugin from './plugin';
import { HandyClient } from './handy-client';
import { requestUrlTransport } from './transport';
import { currentNoteLinks, frequentLinks } from './links';
import { formatInsertToken } from './token';

export const VIEW_TYPE_LINK_DICTATE_CO = 'link-dictate-co';

const VAULT_LINK_LIMIT = 25;
const POLL_INTERVAL_MS = 2000;

export class LinkDictateCoView extends ItemView {
	plugin: LinkDictateCoPlugin;
	rootEl: HTMLElement;
	statusEl: HTMLElement;
	currentSectionEl: HTMLElement;
	vaultSectionEl: HTMLElement;
	pollTimer?: number;

	constructor(leaf: WorkspaceLeaf, plugin: LinkDictateCoPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.rootEl = this.contentEl.createDiv({ cls: 'link-dictate-co-container' });
		this.statusEl = this.rootEl.createDiv({ cls: 'link-dictate-co-status ldc-idle' });
		this.currentSectionEl = this.rootEl.createDiv({ cls: 'link-dictate-co-section' });
		this.vaultSectionEl = this.rootEl.createDiv({ cls: 'link-dictate-co-section' });
	}

	getViewType(): string {
		return VIEW_TYPE_LINK_DICTATE_CO;
	}

	getDisplayText(): string {
		return 'Link Dictate Co';
	}

	async onOpen(): Promise<void> {
		this.renderStaticSections();
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

	private renderStaticSections(): void {
		this.currentSectionEl.empty();
		this.currentSectionEl.createDiv({
			cls: 'link-dictate-co-section-title',
			text: 'Current note',
		});

		this.vaultSectionEl.empty();
		this.vaultSectionEl.createDiv({
			cls: 'link-dictate-co-section-title',
			text: 'Vault-wide frequent links',
		});
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
		const currentLinks = currentNoteLinks(resolved, currentPath);

		this.renderList(this.currentSectionEl, currentLinks, false);

		if (!currentOnly) {
			const frequent = frequentLinks(resolved, VAULT_LINK_LIMIT);
			this.renderList(
				this.vaultSectionEl,
				frequent.map((link) => link.target),
				true,
				frequent,
			);
		}
	}

	private renderList(
		section: HTMLElement,
		targets: string[],
		showCounts: boolean,
		counts?: { target: string; count: number }[],
	): void {
		// Preserve the title element.
		const title = section.querySelector('.link-dictate-co-section-title');
		section.empty();
		if (title) {
			section.appendChild(title);
		}

		const list = section.createDiv({ cls: 'link-dictate-co-list' });

		if (targets.length === 0) {
			list.createDiv({
				cls: 'link-dictate-co-empty',
				text: 'No links available',
			});
			return;
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

import {
	ItemView,
	Notice,
	parseFrontMatterAliases,
	WorkspaceLeaf,
} from 'obsidian';
import type LinkDictateCoPlugin from './plugin';
import { HandyClient } from './handy-client';
import { requestUrlTransport } from './transport';
import { currentNoteLinks, frequentLinks, sameFolderLinks, type FrequentLink } from './links';
import { formatInsertToken } from './token';
import {
	basenameOfTarget,
	extractUsedAliases,
	filterAliases,
	groupCollisions,
	mergeCurrentAndFolderRows,
	parentDirOf,
	parseLinkFilters,
	targetMatchesFilters,
	type MergedRow,
} from './display';
import { colorForTarget, prepareColorContext, styleForColor, type ColorContext } from './colorer';

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
		const colorContext = prepareColorContext(this.app);
		const colorCache = new Map<string, string>();
		const filters = parseLinkFilters(settings.linkFilters);
		const usedAliases = this.gatherUsedAliases(currentPath, resolved);

		const sameFolderUnfiltered =
			settings.showSameFolder && activeFile
				? sameFolderLinks(resolved, currentPath, VAULT_LINK_LIMIT)
				: [];
		const sameFolderFiltered = sameFolderUnfiltered.filter((link) =>
			targetMatchesFilters(link.target, filters),
		);

		if (settings.showCurrentNote && settings.showSameFolder) {
			this.sameFolderSectionEl.empty();
			this.sameFolderSectionEl.style.display = 'none';
			const currentTargets = currentNoteLinks(resolved, currentPath).filter((target) =>
				targetMatchesFilters(target, filters),
			);
			const merged = mergeCurrentAndFolderRows(currentTargets, sameFolderFiltered);
			this.currentHasLinks = this.renderSection(
				this.currentSectionEl,
				true,
				'Current note & folder',
				merged,
				colorContext,
				colorCache,
				usedAliases,
			);
			this.sameFolderHasLinks = false;
		} else {
			this.currentHasLinks = this.renderSection(
				this.currentSectionEl,
				settings.showCurrentNote,
				'Current note',
				currentNoteLinks(resolved, currentPath)
					.filter((target) => targetMatchesFilters(target, filters))
					.map((target) => ({ target, count: 0, fromCurrent: true })),
				colorContext,
				colorCache,
				usedAliases,
			);

			this.sameFolderHasLinks = this.renderSection(
				this.sameFolderSectionEl,
				settings.showSameFolder,
				'Same folder',
				sameFolderFiltered.map((link) => ({ ...link, fromCurrent: false })),
				colorContext,
				colorCache,
				usedAliases,
			);
		}

		if (!currentOnly) {
			const frequent = settings.showVaultWide
				? frequentLinks(resolved, VAULT_LINK_LIMIT)
				: [];
			this.vaultHasLinks = this.renderSection(
				this.vaultSectionEl,
				settings.showVaultWide,
				'Vault-wide frequent links',
				frequent
					.filter((link) => targetMatchesFilters(link.target, filters))
					.map((link) => ({ ...link, fromCurrent: false })),
				colorContext,
				colorCache,
				usedAliases,
			);
		}

		this.updateEmptyHint();
	}

	private gatherUsedAliases(
		currentPath: string,
		resolved: Record<string, Record<string, number>>,
	): Set<string> {
		if (!currentPath) {
			return new Set();
		}
		const currentFolder = parentDirOf(currentPath);
		const paths = [currentPath];
		for (const path of Object.keys(resolved)) {
			if (path !== currentPath && parentDirOf(path) === currentFolder) {
				paths.push(path);
			}
		}
		const originals: string[] = [];
		for (const path of paths) {
			const cache = this.app.metadataCache.getCache(path);
			if (!cache?.links) continue;
			for (const link of cache.links) {
				if (link.original) {
					originals.push(link.original);
				}
			}
		}
		return extractUsedAliases(originals);
	}

	private updateEmptyHint(): void {
		const { settings } = this.plugin;
		const enabledSections =
			((settings.showCurrentNote || settings.showSameFolder) ? 1 : 0) +
			(settings.showVaultWide ? 1 : 0);
		const hasLinks =
			((settings.showCurrentNote || settings.showSameFolder) && this.currentHasLinks) ||
			(settings.showVaultWide && this.vaultHasLinks);
		this.emptyHintEl.style.display = enabledSections > 0 && !hasLinks ? '' : 'none';
	}

	private renderSection(
		section: HTMLElement,
		enabled: boolean,
		title: string,
		rows: MergedRow[],
		colorContext: ColorContext | null,
		colorCache: Map<string, string>,
		usedAliases: Set<string>,
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

		if (rows.length === 0) {
			list.createDiv({
				cls: 'link-dictate-co-empty',
				text: 'No links available',
			});
			return false;
		}

		const targets = rows.map((row) => row.target);
		const collisions = groupCollisions(targets);

		for (const row of rows) {
			const { target, count, fromCurrent } = row;
			const aliases = this.getAliases(target, usedAliases);
			const firstAlias = aliases[0] ?? null;
			const rowEl = list.createDiv({ cls: 'link-dictate-co-row' });
			if (fromCurrent) {
				rowEl.addClass('link-dictate-co-from-current');
			}
			const base = basenameOfTarget(target);

			const main = rowEl.createDiv({ cls: 'link-dictate-co-main' });
			const wrap = main.createDiv({ cls: 'link-dictate-co-target-wrap' });
			const targetSpan = wrap.createSpan({
				cls: 'link-dictate-co-target',
				text: base,
			});

			if (collisions.has(base)) {
				const folder = parentDirOf(target);
				if (folder) {
					wrap.createSpan({ cls: 'link-dictate-co-folder', text: folder });
				}
			}

			if (count > 0) {
				main.createSpan({ cls: 'link-dictate-co-count', text: String(count) });
			}

			const color = this.getCachedColor(target, colorContext, colorCache);
			if (color) {
				targetSpan.style.cssText = styleForColor(color);
			}

			main.addEventListener('click', () => {
				void this.handleInsert(target, firstAlias);
			});

			for (const alias of aliases) {
				const aliasRow = rowEl.createDiv({
					cls: 'link-dictate-co-alias-row',
					text: alias,
				});
				if (color) {
					aliasRow.style.cssText = styleForColor(color);
				}
				aliasRow.addEventListener('click', () => {
					void this.handleInsert(target, alias, true);
				});
			}
		}

		return true;
	}

	private getAliases(target: string, usedAliases: Set<string>): string[] {
		const cache = this.app.metadataCache.getCache(target);
		const raw = cache?.frontmatter ? parseFrontMatterAliases(cache.frontmatter) : null;
		const used = this.plugin.settings.aliasMode === 'used' ? usedAliases : undefined;
		return filterAliases(raw, target, used);
	}

	private getCachedColor(
		target: string,
		colorContext: ColorContext | null,
		colorCache: Map<string, string>,
	): string | null {
		if (!colorContext) return null;
		const cached = colorCache.get(target);
		if (cached !== undefined) return cached;
		const color = colorForTarget(target, colorContext);
		if (color) {
			colorCache.set(target, color);
		}
		return color;
	}

	private async handleInsert(target: string, alias: string | null = null, forceAlias = false): Promise<void> {
		const token = formatInsertToken(target, alias, this.plugin.settings.insertStyle, forceAlias);
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

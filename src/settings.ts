import {
	App,
	Notice,
	PluginSettingTab,
	Setting,
} from 'obsidian';
import type LinkDictateCoPlugin from './plugin';
import { HandyClient } from './handy-client';
import { requestUrlTransport } from './transport';
import {
	DEFAULT_SETTINGS,
	mergeSettings,
	type LinkDictateCoSettings,
} from './settings-core';

export class LinkDictateCoSettingTab extends PluginSettingTab {
	plugin: LinkDictateCoPlugin;

	constructor(app: App, plugin: LinkDictateCoPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Handy port')
			.setDesc('The loopback HTTP port Handy listens on.')
			.addText((text) =>
				text
					.setPlaceholder('48213')
					.setValue(String(this.plugin.settings.port))
					.onChange(async (value) => {
						const parsed = parseInt(value, 10);
						this.plugin.settings.port =
							!Number.isNaN(parsed) && parsed > 0 ? parsed : DEFAULT_SETTINGS.port;
						await this.plugin.saveData(this.plugin.settings);
					}),
			);

		new Setting(containerEl)
			.setName('Handy secret')
			.setDesc('Bearer token from Handy → Integrations.')
			.addText((text) =>
				text
					.setPlaceholder('paste secret here')
					.setValue(this.plugin.settings.secret)
					.onChange(async (value) => {
						this.plugin.settings.secret = value;
						await this.plugin.saveData(this.plugin.settings);
					}),
			);

		new Setting(containerEl)
			.setName('Insert style')
			.setDesc('How inserted tokens are formatted.')
			.addDropdown((dropdown) =>
				dropdown
					.addOption('wikilink', '[[Target]]')
					.addOption('alias', '[[Target|Alias]]')
					.setValue(this.plugin.settings.insertStyle)
					.onChange(async (value) => {
						const style = value as 'wikilink' | 'alias';
						this.plugin.settings.insertStyle = style;
						await this.plugin.saveData(this.plugin.settings);
					}),
			);

		new Setting(containerEl)
			.setName('Link filter')
			.setDesc(
				'Comma-separated. Only links whose note name (=display name) or full path contains one of these are shown. Leave empty to show all links.',
			)
			.addText((text) =>
				text
					.setPlaceholder('Char - , Worldbuilding/')
					.setValue(this.plugin.settings.linkFilters)
					.onChange(async (value) => {
						this.plugin.settings.linkFilters = value;
						await this.plugin.saveData(this.plugin.settings);
						this.plugin.refreshView();
					}),
			);

		new Setting(containerEl)
			.setName('Panel sections')
			.setHeading();

		const toggles: Array<{
			key: keyof Pick<
				LinkDictateCoSettings,
				'showCurrentNote' | 'showSameFolder' | 'showVaultWide'
			>;
			name: string;
			desc: string;
		}> = [
			{
				key: 'showCurrentNote',
				name: 'Show current-note links',
				desc: 'Links on the current note',
			},
			{
				key: 'showSameFolder',
				name: 'Show same-folder links',
				desc: 'Links used in the same folder',
			},
			{
				key: 'showVaultWide',
				name: 'Show vault-wide links',
				desc: 'Top links used across the vault',
			},
		];

		for (const { key, name, desc } of toggles) {
			new Setting(containerEl)
				.setName(name)
				.setDesc(desc)
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings[key])
						.onChange(async (value) => {
							this.plugin.settings[key] = value;
							await this.plugin.saveData(this.plugin.settings);
							this.plugin.refreshView();
						}),
				);
		}

		new Setting(containerEl)
			.setName('Alias display')
			.setDesc('Which aliases to show as sub-rows.')
			.addDropdown((dropdown) =>
				dropdown
					.addOption('all', 'All aliases')
					.addOption('used', 'Only used aliases')
					.setValue(this.plugin.settings.aliasMode)
					.onChange(async (value) => {
						const mode = value as 'all' | 'used';
						this.plugin.settings.aliasMode = mode;
						await this.plugin.saveData(this.plugin.settings);
						this.plugin.refreshView();
					}),
			);

		new Setting(containerEl)
			.setName('Test connection')
			.setDesc('Ping Handy on the configured port.')
			.addButton((button) =>
				button
					.setButtonText('Test')
					.setCta()
					.onClick(async () => {
						const client = new HandyClient(
							this.plugin.settings.port,
							this.plugin.settings.secret,
							requestUrlTransport,
						);
						const status = await client.health();
						if (status === 'ok') {
							new Notice('Handy is reachable');
						} else {
							new Notice('Handy is down or unreachable');
						}
					}),
			);
	}
}

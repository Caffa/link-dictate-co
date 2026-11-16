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

export { DEFAULT_SETTINGS, mergeSettings, type LinkDictateCoSettings };

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

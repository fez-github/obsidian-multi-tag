import { Menu, Plugin, TFile, TFolder } from "obsidian";

import { TagModal } from "./TagModal";
import { SettingTab } from "./SettingTab";
import { MultiTagSettings } from "./SettingTab";

const defaultSettings: MultiTagSettings = {
	yamlOrInline: "inline",
};

export default class MultiTagPlugin extends Plugin {
	settings: MultiTagSettings;
	//Set as Events to unload when needed.
	async onload() {
		await this.loadSettings();
		// this.app.vault.adapter.append("test-folder/file-3","text")
		//Set up modal for adding tags to all files in a folder.
		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file, source) => {
				if (file instanceof TFolder) {
					menu.addItem((item) => {
						item
							.setIcon("tag")
							.setTitle("Tag folder's files")
							.onClick(() =>
								new TagModal(
									this.app,
									file,
									this.settings.yamlOrInline,
									async (obj, string, setting) => {
										this.settings.yamlOrInline = setting;
										await this.saveSettings();
										this.searchThroughFolders(obj, string);
									}
								).open()
							);
					});
				}
			})
		);
		//Set up modal for adding tags to all selected files.
		this.registerEvent(
			this.app.workspace.on("files-menu", (menu, files, source) => {
				menu.addItem((item) => {
					item
						.setIcon("tag")
						.setTitle("Tag selected files")
						.onClick(() =>
							new TagModal(
								this.app,
								files,
								this.settings.yamlOrInline,
								async (obj, string, setting) => {
									this.settings.yamlOrInline = setting;
									await this.saveSettings();
									this.searchThroughFiles(obj, string);
								}
							).open()
						);
				});
			})
		);
		this.registerEvent(
			this.app.workspace.on("search:results-menu", (menu: Menu, leaf: any) => {
				menu.addItem((item) => {
					item
						.setIcon("tag")
						.setTitle("Add tags to search results")
						.onClick(() => {
							let files: any[] = [];
							leaf.dom.vChildren.children.forEach((e: any) => {
								files.push(e.file);
							});
							new TagModal(
								this.app,
								files,
								this.settings.yamlOrInline,
								async (obj, string, setting) => {
									this.settings.yamlOrInline = setting;
									await this.saveSettings();
									this.searchThroughFiles(obj, string);
								}
							).open()
						});
				});
			})
		);
		this.addSettingTab(new SettingTab(this.app, this));
	}

	/** Get all files belonging to a folder. */
	searchThroughFolders(obj: TFolder, string: string) {
		for (let child of obj.children) {
			if (child instanceof TFolder) {
				this.searchThroughFolders(child, string);
			}
			if (child instanceof TFile && child.extension === "md") {
				if (this.settings.yamlOrInline === "inline") {
					this.appendToFile(child, string);
				} else {
					this.addToFrontMatter(child, string);
				}
			}
		}
	}

	/** Iterate through a selection of files. */
	searchThroughFiles(arr: (TFile | TFolder)[], string: string) {
		for (let el of arr) {
			if (el instanceof TFile && el.extension === "md") {
				if (this.settings.yamlOrInline === "inline") {
					this.appendToFile(el, string);
				} else {
					this.addToFrontMatter(el, string);
				}
			}
		}
	}

	/** Add a tag to the bottom of a note. */
	appendToFile(file: TFile, string: string) {
		const tags = string.split(",");
		for (let tag of tags) {
			this.app.vault.append(file, `\n#${tag}`);
		}
	}

	/** Add tags to the top of a note. */
	addToFrontMatter(file: TFile, string: string) {
		const tags = string.split(",");
		this.app.fileManager.processFrontMatter(file, (fm: any) => {
			if (!fm.tags) {
				fm.tags = new Set(tags);
			} else {
				let curTags = [...fm.tags]

				//Conditions are here in case user has spelled "tags" differently.  Any other way to solve this?
				if(fm.TAGS){
					curTags.push(...fm.TAGS);
					delete fm.TAGS
				}
				if(fm.Tags){
					curTags.push(...fm.Tags);
					delete fm.Tags
				}

				fm.tags = new Set([...curTags, ...tags]);
			}
		});
	}

	async loadSettings() {
		this.settings = Object.assign({}, defaultSettings, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

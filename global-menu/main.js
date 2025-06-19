// main.js - Global Menu Plugin with advanced customization, UI corrections and bug fixes

const {
    Plugin,
    PluginSettingTab,
    Setting,
    MarkdownView,
    FuzzySuggestModal,
    Modal,
    Notice,
    TFile
} = require('obsidian');

// --- Constants and Default Settings ---

const MENU_POSITION_CLASSES = {
    top: 'global-menu-top',
    bottom: 'global-menu-bottom',
};

const MAIN_MENU_ID = 'main-menu'; // Constant ID for the main menu
const BASE_RULE_ID = 'base-all-notes-rule'; // Constant ID for the base rule

const DEFAULT_SETTINGS = {
    menus: [
        {
            id: MAIN_MENU_ID,
            name: 'Main Menu',
            enabled: true,
            showMenuTitle: true,
            menuTitle: 'NAVIGATION', // Translated
            items: [
                { name: 'Dashboard', enabled: true, type: 'note', value: 'Dashboard', newTab: false }
            ]
        }
    ],
    rules: [
        {
            id: BASE_RULE_ID,
            enabled: true,
            type: 'all',
            value: '*',
            menuId: MAIN_MENU_ID
        }
    ],
    menuPosition: 'top',
    menuStyle: 'auto-system', // Default to auto-system
    autoRefresh: false,
    openLinksInNewTab: false,
    showMenuOnlyInActiveNote: false,
    typography: {
        fontFamily: 'var(--font-text)',
        fontSize: '0.9em',
        fontWeight: 'normal',
        textTransform: 'none',
        titleFontFamily: 'var(--font-interface)',
        titleFontSize: '0.9em',
        titleFontWeight: '600',
        titleTextTransform: 'uppercase'
    },
    spacingLayout: {
        menuPadding: '8px 15px',
        itemPadding: '6px 12px',
        itemGap: '8px',
        borderRadius: '0px',
        menuBorderWidth: '1px',
        menuBorderRadius: '0px'
    },
    customLightStyle: {
        menuBg: '#ffffff',
        menuText: '#333333',
        menuBorder: '#e1e1e1',
        menuHover: '#f5f5f5',
        menuAccent: '#007bff',
        typography: {
            fontFamily: 'var(--font-text)',
            fontSize: '0.9em',
            fontWeight: 'normal',
            textTransform: 'none',
            titleFontFamily: 'var(--font-interface)',
            titleFontSize: '0.9em',
            titleFontWeight: '600',
            titleTextTransform: 'uppercase'
        },
        spacingLayout: {
            menuPadding: '8px 15px',
            itemPadding: '6px 12px',
            itemGap: '8px',
            borderRadius: '0px',
            menuBorderWidth: '1px',
            menuBorderRadius: '0px'
        }
    },
    customDarkStyle: {
        menuBg: '#2b2b2b',
        menuText: '#dddddd',
        menuBorder: '#444444',
        menuHover: '#3c3c3c',
        menuAccent: '#bb86fc',
        typography: {
            fontFamily: 'var(--font-text)',
            fontSize: '0.9em',
            fontWeight: 'normal',
            textTransform: 'none',
            titleFontFamily: 'var(--font-interface)',
            titleFontSize: '0.9em',
            titleFontWeight: '600',
            titleTextTransform: 'uppercase'
        },
        spacingLayout: {
            menuPadding: '8px 15px',
            itemPadding: '6px 12px',
            itemGap: '8px',
            borderRadius: '0px',
            menuBorderWidth: '1px',
            menuBorderRadius: '0px'
        }
    }
};

// --- Suggestion Modals ---

/**
 * Modal to suggest Markdown files within the Obsidian vault.
 */
class FileSuggestModal extends FuzzySuggestModal {
    constructor(app, onChoose) {
        super(app);
        this.onChoose = onChoose;
    }

    getItems() {
        return this.app.vault.getMarkdownFiles().map(file => ({
            name: file.basename,
            path: file.path,
            file: file
        }));
    }

    getItemText(item) {
        return item.name;
    }

    onChooseItem(item) {
        this.onChoose(item);
    }
}

/**
 * Modal to suggest existing tags within the Obsidian vault.
 */
class TagSuggestModal extends FuzzySuggestModal {
    constructor(app, onChoose) {
        super(app);
        this.onChoose = onChoose;
    }

    getItems() {
        return Object.keys(this.app.metadataCache.getTags()).map(tag => tag.substring(1));
    }

    getItemText(item) {
        return item;
    }

    onChooseItem(item) {
        this.onChoose(item);
    }
}

/**
 * Modal to suggest existing folders within the Obsidian vault.
 */
class FolderSuggestModal extends FuzzySuggestModal {
    constructor(app, onChoose) {
        super(app);
        this.onChoose = onChoose;
    }

    getItems() {
        const folders = new Set();
        this.app.vault.getAllLoadedFiles().forEach(file => {
            if (file.parent && file.parent.path !== '') {
                folders.add(file.parent.path + '/');
            }
        });
        if (!folders.has('/')) {
            folders.add('/');
        }
        return Array.from(folders).sort();
    }

    getItemText(item) {
        return item;
    }

    onChooseItem(item) {
        this.onChoose(item);
    }
}

/**
 * Modal to suggest commands within Obsidian.
 */
class CommandSuggestModal extends FuzzySuggestModal {
    constructor(app, onChoose) {
        super(app);
        this.onChoose = onChoose;
    }

    getItems() {
        return Object.values(this.app.commands.commands);
    }

    getItemText(item) {
        return item.name || item.id;
    }

    onChooseItem(item) {
        this.onChoose(item);
    }
}

// --- Menu Editor Modal ---

/**
 * Modal for editing specific menu details, including its items.
 */
class MenuEditorModal extends Modal {
    constructor(app, plugin, menuData, onSave, isMainMenu = false) {
        super(app);
        this.plugin = plugin;
        this.menuData = JSON.parse(JSON.stringify(menuData));
        this.onSave = onSave;
        this.isMainMenu = isMainMenu;
        this.titleEl.setText(`Edit Menu: ${this.menuData.name}`);
        this.modalEl.addClass('global-menu-editor-modal');
    }

    onOpen() {
        this.display();
    }

    onClose() {
        let { contentEl } = this;
        contentEl.empty();
    }

    display() {
        let { contentEl } = this;
        contentEl.empty();

        // Menu Name
        new Setting(contentEl)
            .setName('Menu Name') // Translated
            .addText(text => text
                .setValue(this.menuData.name)
                .setDisabled(this.isMainMenu)
                .onChange(async (value) => {
                    this.menuData.name = value;
                    this.titleEl.setText(`Edit Menu: ${this.menuData.name}`); // Translated
                }));

        // Enable Menu
        new Setting(contentEl)
            .setName('Enable Menu') // Translated
            .addToggle(toggle => toggle
                .setValue(this.menuData.enabled)
                .onChange(async (value) => {
                    this.menuData.enabled = value;
                }));

        // Show Menu Title
        new Setting(contentEl)
            .setName('Show Menu Title') // Translated
            .addToggle(toggle => toggle
                .setValue(this.menuData.showMenuTitle)
                .onChange(async (value) => {
                    this.menuData.showMenuTitle = value;
                    this.display();
                }));

        // Menu Title Text (conditionally displayed)
        if (this.menuData.showMenuTitle) {
            new Setting(contentEl)
                .setName('Menu Title Text') // Translated
                .addText(text => text
                    .setPlaceholder('e.g. NAVIGATION') // Translated
                    .setValue(this.menuData.menuTitle)
                    .onChange(async (value) => {
                        this.menuData.menuTitle = value;
                    }));
        }

        contentEl.createEl('h4', { text: 'Menu Items' }); // Translated

        // Add New Item Button
        new Setting(contentEl)
            .setName('Add New Item') // Translated
            .addButton(btn => btn
                .setButtonText('Add Item') // Translated
                .setCta()
                .onClick(async () => {
                    this.menuData.items.push({ name: 'New Item', enabled: true, type: 'note', value: '', newTab: false }); // Translated
                    this.display();
                }));

        // Display and manage existing menu items with drag-and-drop
        const menuItemsContainer = contentEl.createDiv({ cls: 'global-menu-items-sortable' });
        menuItemsContainer.id = `sortable-menu-${this.menuData.id}`;

        this.menuData.items.forEach((item, itemIndex) => {
            const itemEl = menuItemsContainer.createDiv({
                cls: 'global-menu-item-setting',
                attr: { 'draggable': 'true', 'data-item-index': itemIndex }
            });

            itemEl.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', itemIndex.toString());
                e.dataTransfer.effectAllowed = 'move';
                itemEl.addClass('is-dragging');
            });

            itemEl.addEventListener('dragenter', (e) => {
                e.preventDefault();
                itemEl.addClass('drag-over');
            });

            itemEl.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });

            itemEl.addEventListener('dragleave', () => {
                itemEl.removeClass('drag-over');
            });

            itemEl.addEventListener('drop', (e) => {
                e.preventDefault();
                itemEl.removeClass('drag-over');
                const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
                const droppedIndex = parseInt(itemEl.dataset.itemIndex);

                if (draggedIndex !== droppedIndex) {
                    const [draggedItem] = this.menuData.items.splice(draggedIndex, 1);
                    this.menuData.items.splice(droppedIndex, 0, draggedItem);
                    this.display();
                }
            });

            itemEl.addEventListener('dragend', () => {
                itemEl.removeClass('is-dragging');
            });

            const itemSetting = new Setting(itemEl);
            itemSetting.setName(`Item ${itemIndex + 1}: ${item.name}`); // Translated

            itemSetting.addToggle(toggle => toggle
                .setTooltip('Enable/Disable this item') // Translated
                .setValue(item.enabled)
                .onChange(async (value) => {
                    item.enabled = value;
                }));

            let itemNameInput;
            itemSetting.addText(text => {
                itemNameInput = text;
                text
                    .setPlaceholder('Display name') // Translated
                    .setValue(item.name)
                    .onChange(async (value) => {
                        item.name = value;
                        itemSetting.setName(`Item ${itemIndex + 1}: ${item.name}`); // Translated
                    });
            });

            itemSetting.addDropdown(dropdown => dropdown
                .addOption('note', 'Note') // Translated
                .addOption('command', 'Command') // Translated
                .setValue(item.type || 'note')
                .onChange(async (value) => {
                    item.type = value;
                    item.value = '';
                    if (item.type === 'note') {
                        if (item.newTab === undefined) {
                            item.newTab = false;
                        }
                    } else {
                        delete item.newTab;
                    }
                    this.display();
                }));

            if (item.type === 'note') {
                let noteValueInput;
                itemSetting.addText(text => {
                    noteValueInput = text;
                    text
                        .setPlaceholder('Note name (e.g. My Note)') // Translated
                        .setValue(item.value)
                        .onChange(async (value) => {
                            item.value = value;
                        });
                });
                itemSetting.addButton(btn => btn
                    .setIcon('folder')
                    .setTooltip('Choose a note') // Translated
                    .onClick(() => {
                        new FileSuggestModal(this.app, (selected) => {
                            item.value = selected.name;
                            if (noteValueInput) {
                                noteValueInput.setValue(selected.name);
                            }
                        }).open();
                    }));
                itemSetting.addToggle(toggle => toggle
                    .setTooltip('Open this note in a new tab') // Translated
                    .setValue(item.newTab !== undefined ? item.newTab : false)
                    .onChange(async (value) => {
                        item.newTab = value;
                    }));

            } else if (item.type === 'command') {
                let commandValueInput;
                itemSetting.addText(text => {
                    commandValueInput = text;
                    text
                        .setPlaceholder('Command ID (e.g. app:go-home)') // Translated
                        .setValue(item.value)
                        .onChange(async (value) => {
                            item.value = value;
                        });
                });
                itemSetting.addButton(btn => btn
                    .setIcon('search')
                    .setTooltip('Choose a command') // Translated
                    .onClick(() => {
                        new CommandSuggestModal(this.app, (selected) => {
                            item.value = selected.id;
                            if (commandValueInput) {
                                commandValueInput.setValue(selected.id);
                            }
                        }).open();
                    }));
            }

            // Move up/down buttons
            itemSetting.addButton(btn => btn
                .setIcon('arrow-up')
                .setTooltip('Move up') // Translated
                .setDisabled(itemIndex === 0)
                .onClick(() => {
                    if (itemIndex > 0) {
                        const [movedItem] = this.menuData.items.splice(itemIndex, 1);
                        this.menuData.items.splice(itemIndex - 1, 0, movedItem);
                        this.display();
                    }
                }));

            itemSetting.addButton(btn => btn
                .setIcon('arrow-down')
                .setTooltip('Move down') // Translated
                .setDisabled(itemIndex === this.menuData.items.length - 1)
                .onClick(() => {
                    if (itemIndex < this.menuData.items.length - 1) {
                        const [movedItem] = this.menuData.items.splice(itemIndex, 1);
                        this.menuData.items.splice(itemIndex + 1, 0, movedItem);
                        this.display();
                    }
                }));

            itemSetting.addButton(btn => btn
                .setButtonText('Remove') // Translated
                .setWarning()
                .onClick(() => {
                    this.menuData.items.splice(itemIndex, 1);
                    this.display();
                }));
        });

        // Save and Cancel Buttons
        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('Save') // Translated
                .setCta()
                .onClick(() => {
                    if (this.menuData.items.length === 0) {
                        new Notice('A menu must contain at least one item.', 3000); // Translated
                        return;
                    }
                    this.onSave(this.menuData);
                    this.close();
                }))
            .addButton(btn => btn
                .setButtonText('Cancel') // Translated
                .onClick(() => {
                    this.close();
                }));
    }
}

// --- Menu Style Editor Modal ---

/**
 * Modal to customize menu style (colors, typography, spacing).
 */
class MenuStyleModal extends Modal {
    constructor(app, plugin, currentSettings, onSave) {
        super(app);
        this.plugin = plugin;
        // Create a deep copy of style settings to allow rollback on cancel
        this.tempSettings = {
            menuStyle: currentSettings.menuStyle,
            // Initialize temp settings based on current plugin settings
            // Ensure deep copy for nested objects like typography and spacingLayout within custom styles
            customLightStyle: {
                ...JSON.parse(JSON.stringify(DEFAULT_SETTINGS.customLightStyle)),
                ...JSON.parse(JSON.stringify(currentSettings.customLightStyle))
            },
            customDarkStyle: {
                ...JSON.parse(JSON.stringify(DEFAULT_SETTINGS.customDarkStyle)),
                ...JSON.parse(JSON.stringify(currentSettings.customDarkStyle))
            },
            typography: {
                ...JSON.parse(JSON.stringify(DEFAULT_SETTINGS.typography)),
                ...JSON.parse(JSON.stringify(currentSettings.typography))
            },
            spacingLayout: {
                ...JSON.parse(JSON.stringify(DEFAULT_SETTINGS.spacingLayout)),
                ...JSON.parse(JSON.stringify(currentSettings.spacingLayout))
            },
        };
        this.onSave = onSave;
        this.titleEl.setText('Customize Menu Style'); // Translated
        this.modalEl.addClass('global-menu-personalization-modal');
        this.previewMenuEl = null;

        // Initialize accordion references to null
        this.lightColorsDetails = null;
        this.darkColorsDetails = null;
        this.globalTypographyDetails = null;
        this.globalSpacingDetails = null;
    }

    onOpen() {
        this.display();
    }

    onClose() {
        this.contentEl.empty();
    }

    /**
     * Updates the menu preview in the modal and section visibility.
     */
    updatePreview() {
        if (this.previewMenuEl) {
            // Apply a temporary class to the preview for specific styling if needed
            this.plugin.applyMenuStyle(this.previewMenuEl, this.tempSettings);
        }
        this.toggleAccordionVisibility();
    }

    /**
     * Controls the visibility of accordion sections based on the selected menu style.
     */
    toggleAccordionVisibility() {
        const style = this.tempSettings.menuStyle;

        // Visibility for Global Typography/Spacing
        const isGlobalStyleVisible = (style === 'auto-system' || style === 'light' || style === 'dark' || style === 'auto-base-light-dark');
        if (this.globalTypographyDetails) {
            this.globalTypographyDetails.style.display = isGlobalStyleVisible ? '' : 'none';
        }
        if (this.globalSpacingDetails) {
            this.globalSpacingDetails.style.display = isGlobalStyleVisible ? '' : 'none';
        }

        // Visibility for Custom Light Mode
        const isCustomLightVisible = (style === 'custom-light' || style === 'auto-custom');
        if (this.lightColorsDetails) {
            this.lightColorsDetails.style.display = isCustomLightVisible ? '' : 'none';
        }

        // Visibility for Custom Dark Mode
        const isCustomDarkVisible = (style === 'custom-dark' || style === 'auto-custom');
        if (this.darkColorsDetails) {
            this.darkColorsDetails.style.display = isCustomDarkVisible ? '' : 'none';
        }
    }

    display() {
        let { contentEl } = this;
        contentEl.empty();

        // Menu Style Selection
        new Setting(contentEl)
            .setName('Menu Style') // Translated
            .setDesc('Choose the visual style of the menu.') // Translated
            .addDropdown(dropdown => dropdown
                .addOption('auto-system', 'Auto (system colors)') // Updated name
                .addOption('auto-base-light-dark', 'Auto (base light and dark mode)') // New option
                .addOption('light', 'Always Light') // Updated name
                .addOption('dark', 'Always Dark') // Updated name
                .addOption('auto-custom', 'Auto (Custom Colors)') // Updated name
                .addOption('custom-light', 'Custom Light') // Translated
                .addOption('custom-dark', 'Custom Dark') // Translated
                .setValue(this.tempSettings.menuStyle)
                .onChange(async (value) => {
                    this.tempSettings.menuStyle = value;
                    this.updatePreview();
                }));

        // --- Global Typography Accordion ---
        this.globalTypographyDetails = contentEl.createEl('details', { cls: 'global-menu-accordion' });
        const summaryGlobalTypography = this.globalTypographyDetails.createEl('summary');
        summaryGlobalTypography.createSpan({ text: 'Default Typography Settings' }); // Translated

        const iconContainerGlobalTypography = summaryGlobalTypography.createDiv({ cls: 'global-menu-accordion-header-icons' });
        const resetIconGlobalTypography = iconContainerGlobalTypography.createDiv({ cls: 'global-menu-accordion-reset-icon' });
        resetIconGlobalTypography.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-rotate-ccw"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.76 2.75L3 8"/><path d="M3 3v5h5"/></svg>';
        resetIconGlobalTypography.onclick = (e) => {
            e.stopPropagation(); // Prevent accordion from toggling
            Object.assign(this.tempSettings.typography, JSON.parse(JSON.stringify(DEFAULT_SETTINGS.typography)));
            this.display(); // Re-render to show updated values
        };

        const chevronIconGlobalTypography = iconContainerGlobalTypography.createDiv({ cls: 'global-menu-accordion-icon' });
        chevronIconGlobalTypography.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>';


        const globalTypographyContent = this.globalTypographyDetails.createDiv({ cls: 'global-menu-accordion-content' });
        this.createTypographySetting(globalTypographyContent, 'Item Font Family', 'fontFamily', this.tempSettings.typography); // Translated
        this.createTypographySetting(globalTypographyContent, 'Item Font Size', 'fontSize', this.tempSettings.typography, 'text'); // Translated
        this.createTypographySetting(globalTypographyContent, 'Item Font Weight', 'fontWeight', this.tempSettings.typography, 'text'); // Translated
        this.createTypographySetting(globalTypographyContent, 'Item Text Transform', 'textTransform', this.tempSettings.typography, 'dropdown', ['none', 'uppercase', 'capitalize', 'lowercase']); // Translated
        this.createTypographySetting(globalTypographyContent, 'Title Font Family', 'titleFontFamily', this.tempSettings.typography); // Translated
        this.createTypographySetting(globalTypographyContent, 'Title Font Size', 'titleFontSize', this.tempSettings.typography, 'text'); // Translated
        this.createTypographySetting(globalTypographyContent, 'Title Font Weight', 'titleFontWeight', this.tempSettings.typography, 'text'); // Translated
        this.createTypographySetting(globalTypographyContent, 'Title Text Transform', 'titleTextTransform', this.tempSettings.typography, 'dropdown', ['none', 'uppercase', 'capitalize', 'lowercase']); // Translated

        // --- Global Spacing and Layout Accordion ---
        this.globalSpacingDetails = contentEl.createEl('details', { cls: 'global-menu-accordion' });
        const summaryGlobalSpacing = this.globalSpacingDetails.createEl('summary');
        summaryGlobalSpacing.createSpan({ text: 'Default Spacing and Layout Settings' }); // Translated

        const iconContainerGlobalSpacing = summaryGlobalSpacing.createDiv({ cls: 'global-menu-accordion-header-icons' });
        const resetIconGlobalSpacing = iconContainerGlobalSpacing.createDiv({ cls: 'global-menu-accordion-reset-icon' });
        resetIconGlobalSpacing.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-rotate-ccw"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.76 2.75L3 8"/><path d="M3 3v5h5"/></svg>';
        resetIconGlobalSpacing.onclick = (e) => {
            e.stopPropagation(); // Prevent accordion from toggling
            Object.assign(this.tempSettings.spacingLayout, JSON.parse(JSON.stringify(DEFAULT_SETTINGS.spacingLayout)));
            this.display(); // Re-render to show updated values
        };

        const chevronIconGlobalSpacing = iconContainerGlobalSpacing.createDiv({ cls: 'global-menu-accordion-icon' });
        chevronIconGlobalSpacing.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>';

        const globalSpacingContent = this.globalSpacingDetails.createDiv({ cls: 'global-menu-accordion-content' });
        this.createSpacingSetting(globalSpacingContent, 'Menu Padding', 'menuPadding', this.tempSettings.spacingLayout); // Translated
        this.createSpacingSetting(globalSpacingContent, 'Item Padding', 'itemPadding', this.tempSettings.spacingLayout); // Translated
        this.createSpacingSetting(globalSpacingContent, 'Item Gap', 'itemGap', this.tempSettings.spacingLayout); // Translated
        this.createSpacingSetting(globalSpacingContent, 'Item Border Radius', 'borderRadius', this.tempSettings.spacingLayout); // Translated
        this.createSpacingSetting(globalSpacingContent, 'Menu Border Width', 'menuBorderWidth', this.tempSettings.spacingLayout); // Translated
        this.createSpacingSetting(globalSpacingContent, 'Menu Container Border Radius', 'menuBorderRadius', this.tempSettings.spacingLayout); // Translated


        // --- Custom Light Mode Accordion ---
        this.lightColorsDetails = contentEl.createEl('details', { cls: 'global-menu-accordion' });
        const summaryLightColors = this.lightColorsDetails.createEl('summary');
        summaryLightColors.createSpan({ text: 'Custom Light Mode Settings' }); // Translated

        const iconContainerLightColors = summaryLightColors.createDiv({ cls: 'global-menu-accordion-header-icons' });
        const resetIconLightColors = iconContainerLightColors.createDiv({ cls: 'global-menu-accordion-reset-icon' });
        resetIconLightColors.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-rotate-ccw"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.76 2.75L3 8"/><path d="M3 3v5h5"/></svg>';
        resetIconLightColors.onclick = (e) => {
            e.stopPropagation(); // Prevent accordion from toggling
            Object.assign(this.tempSettings.customLightStyle, JSON.parse(JSON.stringify(DEFAULT_SETTINGS.customLightStyle)));
            this.display(); // Re-render to show updated values
        };

        const chevronIconLightColors = iconContainerLightColors.createDiv({ cls: 'global-menu-accordion-icon' });
        chevronIconLightColors.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>';

        const lightColorsContent = this.lightColorsDetails.createDiv({ cls: 'global-menu-accordion-content' });

        this.createColorSetting(lightColorsContent, 'Background Color', 'menuBg', this.tempSettings.customLightStyle); // Translated
        this.createColorSetting(lightColorsContent, 'Text Color', 'menuText', this.tempSettings.customLightStyle); // Translated
        this.createColorSetting(lightColorsContent, 'Border Color', 'menuBorder', this.tempSettings.customLightStyle); // Translated
        this.createColorSetting(lightColorsContent, 'Hover Background', 'menuHover', this.tempSettings.customLightStyle); // Translated
        this.createColorSetting(lightColorsContent, 'Accent Color', 'menuAccent', this.tempSettings.customLightStyle); // Translated

        // Typography for Light Mode (nested)
        const lightTypographyDetails = lightColorsContent.createEl('details', { cls: 'global-menu-sub-accordion' });
        const summaryLightTypography = lightTypographyDetails.createEl('summary');
        summaryLightTypography.createSpan({ text: 'Typography (Light Mode)' }); // Translated

        const iconContainerLightTypography = summaryLightTypography.createDiv({ cls: 'global-menu-accordion-header-icons' });
        const resetIconLightTypography = iconContainerLightTypography.createDiv({ cls: 'global-menu-accordion-reset-icon' });
        resetIconLightTypography.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-rotate-ccw"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.76 2.75L3 8"/><path d="M3 3v5h5"/></svg>';
        resetIconLightTypography.onclick = (e) => {
            e.stopPropagation();
            Object.assign(this.tempSettings.customLightStyle.typography, JSON.parse(JSON.stringify(DEFAULT_SETTINGS.customLightStyle.typography)));
            this.display();
        };
        const chevronIconLightTypography = iconContainerLightTypography.createDiv({ cls: 'global-menu-accordion-icon' });
        chevronIconLightTypography.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>';
        
        const lightTypographyContent = lightTypographyDetails.createDiv({ cls: 'global-menu-accordion-content' });
        this.createTypographySetting(lightTypographyContent, 'Item Font Family', 'fontFamily', this.tempSettings.customLightStyle.typography); // Translated
        this.createTypographySetting(lightTypographyContent, 'Item Font Size', 'fontSize', this.tempSettings.customLightStyle.typography, 'text'); // Translated
        this.createTypographySetting(lightTypographyContent, 'Item Font Weight', 'fontWeight', this.tempSettings.customLightStyle.typography, 'text'); // Translated
        this.createTypographySetting(lightTypographyContent, 'Item Text Transform', 'textTransform', this.tempSettings.customLightStyle.typography, 'dropdown', ['none', 'uppercase', 'capitalize', 'lowercase']); // Translated
        this.createTypographySetting(lightTypographyContent, 'Title Font Family', 'titleFontFamily', this.tempSettings.customLightStyle.typography); // Translated
        this.createTypographySetting(lightTypographyContent, 'Title Font Size', 'titleFontSize', this.tempSettings.customLightStyle.typography, 'text'); // Translated
        this.createTypographySetting(lightTypographyContent, 'Title Font Weight', 'titleFontWeight', this.tempSettings.customLightStyle.typography, 'text'); // Translated
        this.createTypographySetting(lightTypographyContent, 'Title Text Transform', 'titleTextTransform', this.tempSettings.customLightStyle.typography, 'dropdown', ['none', 'uppercase', 'capitalize', 'lowercase']); // Translated


        // Spacing and Layout for Light Mode (nested)
        const lightSpacingDetails = lightColorsContent.createEl('details', { cls: 'global-menu-sub-accordion' });
        const summaryLightSpacing = lightSpacingDetails.createEl('summary');
        summaryLightSpacing.createSpan({ text: 'Spacing and Layout (Light Mode)' }); // Translated

        const iconContainerLightSpacing = summaryLightSpacing.createDiv({ cls: 'global-menu-accordion-header-icons' });
        const resetIconLightSpacing = iconContainerLightSpacing.createDiv({ cls: 'global-menu-accordion-reset-icon' });
        resetIconLightSpacing.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-rotate-ccw"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.76 2.75L3 8"/><path d="M3 3v5h5"/></svg>';
        resetIconLightSpacing.onclick = (e) => {
            e.stopPropagation();
            Object.assign(this.tempSettings.customLightStyle.spacingLayout, JSON.parse(JSON.stringify(DEFAULT_SETTINGS.customLightStyle.spacingLayout)));
            this.display();
        };
        const chevronIconLightSpacing = iconContainerLightSpacing.createDiv({ cls: 'global-menu-accordion-icon' });
        chevronIconLightSpacing.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>';

        const lightSpacingContent = lightSpacingDetails.createDiv({ cls: 'global-menu-accordion-content' });
        this.createSpacingSetting(lightSpacingContent, 'Menu Padding', 'menuPadding', this.tempSettings.customLightStyle.spacingLayout); // Translated
        this.createSpacingSetting(lightSpacingContent, 'Item Padding', 'itemPadding', this.tempSettings.customLightStyle.spacingLayout); // Translated
        this.createSpacingSetting(lightSpacingContent, 'Item Gap', 'itemGap', this.tempSettings.customLightStyle.spacingLayout); // Translated
        this.createSpacingSetting(lightSpacingContent, 'Item Border Radius', 'borderRadius', this.tempSettings.customLightStyle.spacingLayout); // Translated
        this.createSpacingSetting(lightSpacingContent, 'Menu Border Width', 'menuBorderWidth', this.tempSettings.customLightStyle.spacingLayout); // Translated
        this.createSpacingSetting(lightSpacingContent, 'Menu Container Border Radius', 'menuBorderRadius', this.tempSettings.customLightStyle.spacingLayout); // Translated


        // --- Custom Dark Mode Accordion ---
        this.darkColorsDetails = contentEl.createEl('details', { cls: 'global-menu-accordion' });
        const summaryDarkColors = this.darkColorsDetails.createEl('summary');
        summaryDarkColors.createSpan({ text: 'Custom Dark Mode Settings' }); // Translated

        const iconContainerDarkColors = summaryDarkColors.createDiv({ cls: 'global-menu-accordion-header-icons' });
        const resetIconDarkColors = iconContainerDarkColors.createDiv({ cls: 'global-menu-accordion-reset-icon' });
        resetIconDarkColors.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-rotate-ccw"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.76 2.75L3 8"/><path d="M3 3v5h5"/></svg>';
        resetIconDarkColors.onclick = (e) => {
            e.stopPropagation();
            Object.assign(this.tempSettings.customDarkStyle, JSON.parse(JSON.stringify(DEFAULT_SETTINGS.customDarkStyle)));
            this.display();
        };
        const chevronIconDarkColors = iconContainerDarkColors.createDiv({ cls: 'global-menu-accordion-icon' });
        chevronIconDarkColors.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>';

        const darkColorsContent = this.darkColorsDetails.createDiv({ cls: 'global-menu-accordion-content' });

        this.createColorSetting(darkColorsContent, 'Background Color', 'menuBg', this.tempSettings.customDarkStyle); // Translated
        this.createColorSetting(darkColorsContent, 'Text Color', 'menuText', this.tempSettings.customDarkStyle); // Translated
        this.createColorSetting(darkColorsContent, 'Border Color', 'menuBorder', this.tempSettings.customDarkStyle); // Translated
        this.createColorSetting(darkColorsContent, 'Hover Background', 'menuHover', this.tempSettings.customDarkStyle); // Translated
        this.createColorSetting(darkColorsContent, 'Accent Color', 'menuAccent', this.tempSettings.customDarkStyle); // Translated

        // Typography for Dark Mode (nested)
        const darkTypographyDetails = darkColorsContent.createEl('details', { cls: 'global-menu-sub-accordion' });
        const summaryDarkTypography = darkTypographyDetails.createEl('summary');
        summaryDarkTypography.createSpan({ text: 'Typography (Dark Mode)' }); // Translated

        const iconContainerDarkTypography = summaryDarkTypography.createDiv({ cls: 'global-menu-accordion-header-icons' });
        const resetIconDarkTypography = iconContainerDarkTypography.createDiv({ cls: 'global-menu-accordion-reset-icon' });
        resetIconDarkTypography.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-rotate-ccw"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.76 2.75L3 8"/><path d="M3 3v5h5"/></svg>';
        resetIconDarkTypography.onclick = (e) => {
            e.stopPropagation();
            Object.assign(this.tempSettings.customDarkStyle.typography, JSON.parse(JSON.stringify(DEFAULT_SETTINGS.customDarkStyle.typography)));
            this.display();
        };
        const chevronIconDarkTypography = iconContainerDarkTypography.createDiv({ cls: 'global-menu-accordion-icon' });
        chevronIconDarkTypography.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>';

        const darkTypographyContent = darkTypographyDetails.createDiv({ cls: 'global-menu-accordion-content' });
        this.createTypographySetting(darkTypographyContent, 'Item Font Family', 'fontFamily', this.tempSettings.customDarkStyle.typography); // Translated
        this.createTypographySetting(darkTypographyContent, 'Item Font Size', 'fontSize', this.tempSettings.customDarkStyle.typography, 'text'); // Translated
        this.createTypographySetting(darkTypographyContent, 'Item Font Weight', 'fontWeight', this.tempSettings.customDarkStyle.typography, 'text'); // Translated
        this.createTypographySetting(darkTypographyContent, 'Item Text Transform', 'textTransform', this.tempSettings.customDarkStyle.typography, 'dropdown', ['none', 'uppercase', 'capitalize', 'lowercase']); // Translated
        this.createTypographySetting(darkTypographyContent, 'Title Font Family', 'titleFontFamily', this.tempSettings.customDarkStyle.typography); // Translated
        this.createTypographySetting(darkTypographyContent, 'Title Font Size', 'titleFontSize', this.tempSettings.customDarkStyle.typography, 'text'); // Translated
        this.createTypographySetting(darkTypographyContent, 'Title Font Weight', 'titleFontWeight', this.tempSettings.customDarkStyle.typography, 'text'); // Translated
        this.createTypographySetting(darkTypographyContent, 'Title Text Transform', 'titleTextTransform', this.tempSettings.customDarkStyle.typography, 'dropdown', ['none', 'uppercase', 'capitalize', 'lowercase']); // Translated


        // Spacing and Layout for Dark Mode (nested)
        const darkSpacingDetails = darkColorsContent.createEl('details', { cls: 'global-menu-sub-accordion' });
        const summaryDarkSpacing = darkSpacingDetails.createEl('summary');
        summaryDarkSpacing.createSpan({ text: 'Spacing and Layout (Dark Mode)' }); // Translated

        const iconContainerDarkSpacing = summaryDarkSpacing.createDiv({ cls: 'global-menu-accordion-header-icons' });
        const resetIconDarkSpacing = iconContainerDarkSpacing.createDiv({ cls: 'global-menu-accordion-reset-icon' });
        resetIconDarkSpacing.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-rotate-ccw"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.76 2.75L3 8"/><path d="M3 3v5h5"/></svg>';
        resetIconDarkSpacing.onclick = (e) => {
            e.stopPropagation();
            Object.assign(this.tempSettings.customDarkStyle.spacingLayout, JSON.parse(JSON.stringify(DEFAULT_SETTINGS.customDarkStyle.spacingLayout)));
            this.display();
        };
        const chevronIconDarkSpacing = iconContainerDarkSpacing.createDiv({ cls: 'global-menu-accordion-icon' });
        chevronIconDarkSpacing.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>';

        const darkSpacingContent = darkSpacingDetails.createDiv({ cls: 'global-menu-accordion-content' });
        this.createSpacingSetting(darkSpacingContent, 'Menu Padding', 'menuPadding', this.tempSettings.customDarkStyle.spacingLayout); // Translated
        this.createSpacingSetting(darkSpacingContent, 'Item Padding', 'itemPadding', this.tempSettings.customDarkStyle.spacingLayout); // Translated
        this.createSpacingSetting(darkSpacingContent, 'Item Gap', 'itemGap', this.tempSettings.customDarkStyle.spacingLayout); // Translated
        this.createSpacingSetting(darkSpacingContent, 'Item Border Radius', 'borderRadius', this.tempSettings.customDarkStyle.spacingLayout); // Translated
        this.createSpacingSetting(darkSpacingContent, 'Menu Border Width', 'menuBorderWidth', this.tempSettings.customDarkStyle.spacingLayout); // Translated
        this.createSpacingSetting(darkSpacingContent, 'Menu Container Border Radius', 'menuBorderRadius', this.tempSettings.customDarkStyle.spacingLayout); // Translated


        // Initial visibility check
        this.toggleAccordionVisibility();


        // Live Preview (simple representation)
        contentEl.createEl('h4', { text: 'Menu Preview' }); // Translated
        const previewContainer = contentEl.createDiv({ cls: 'global-menu-style-preview-container' });
        this.previewMenuEl = previewContainer.createDiv({ cls: 'global-menu-container' });
        
        this.previewMenuEl.addClass('global-menu-preview');
        this.previewMenuEl.setCssStyles({
            'pointer-events': 'none',
            'position': 'relative',
            'width': '100%',
        });
        this.updatePreview();

        // Re-render a dummy menu for preview
        const mockMenuData = {
            showMenuTitle: true,
            menuTitle: 'Menu Preview', // Translated
            items: [
                { name: 'Preview Item 1', enabled: true }, // Translated
                { name: 'Preview Item 2', enabled: true }  // Translated
            ]
        };

        if (mockMenuData.showMenuTitle && mockMenuData.menuTitle) {
            this.previewMenuEl.createEl('div', { text: mockMenuData.menuTitle, cls: 'global-menu-title' });
        }
        const previewList = this.previewMenuEl.createEl('ul', { cls: 'global-menu-list' });
        mockMenuData.items.forEach(item => {
            const listItem = previewList.createEl('li', { cls: 'global-menu-item' });
            listItem.createEl('a', { text: item.name, href: '#' });
        });

        // Save and Cancel Buttons
        const buttonSection = new Setting(contentEl);
        buttonSection.addButton(btn => btn
            .setButtonText('Reset Style') // Translated
            .setClass('mod-warning') // Apply a warning style if appropriate
            .onClick(() => {
                new CustomConfirmModal(this.app, 'Confirm Reset Style', 'Are you sure you want to reset all style settings to default?', () => { // Translated
                    // Reset all relevant style settings to their default values
                    this.tempSettings.menuStyle = DEFAULT_SETTINGS.menuStyle;
                    this.tempSettings.typography = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.typography));
                    this.tempSettings.spacingLayout = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.spacingLayout));
                    this.tempSettings.customLightStyle = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.customLightStyle));
                    this.tempSettings.customDarkStyle = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.customDarkStyle));
                    this.display(); // Re-render the modal with default values
                }, () => {
                    // Do nothing on cancel
                }).open();
            }));

        buttonSection.addButton(btn => btn
            .setButtonText('Save') // Translated
            .setCta()
            .onClick(() => {
                this.onSave(this.tempSettings);
                this.close();
            }));
        buttonSection.addButton(btn => btn
            .setButtonText('Cancel') // Translated
            .onClick(() => {
                this.close();
            }));
    }

    /**
     * Helper function to create color settings with text and color inputs.
     * @param {HTMLElement} containerEl - The container element.
     * @param {string} name - The setting name.
     * @param {string} key - The property key in the target object.
     * @param {object} targetObject - The object containing the property to modify (e.g., this.tempSettings.customLightStyle).
     */
    createColorSetting(containerEl, name, key, targetObject) {
        new Setting(containerEl)
            .setName(name)
            .addText(text => {
                const textInputEl = text.inputEl;
                textInputEl.type = 'text';
                textInputEl.value = targetObject[key];

                const colorInputEl = textInputEl.cloneNode();
                colorInputEl.type = 'color';
                colorInputEl.style.width = '70px';
                colorInputEl.value = targetObject[key];

                textInputEl.parentNode.appendChild(colorInputEl);

                const handleChange = (newValue) => {
                    targetObject[key] = newValue;
                    textInputEl.value = newValue;
                    colorInputEl.value = newValue;
                    this.updatePreview();
                };

                textInputEl.oninput = (e) => handleChange(e.target.value);
                colorInputEl.oninput = (e) => handleChange(e.target.value);
            });
    }

    /**
     * Helper function to create typography settings.
     * @param {HTMLElement} containerEl - The container element.
     * @param {string} name - The setting name.
     * @param {string} key - The property key in the target object.
     * @param {object} targetObject - The object containing the typography property.
     * @param {'text'|'dropdown'} type - The input type (text or dropdown).
     * @param {string[]} [options=[]] - Options for the dropdown.
     */
    createTypographySetting(containerEl, name, key, targetObject, type = 'text', options = []) {
        const setting = new Setting(containerEl)
            .setName(name);

        if (type === 'text') {
            setting.addText(text => text
                .setValue(targetObject[key])
                .onChange(async (value) => {
                    targetObject[key] = value;
                    this.updatePreview();
                }));
        } else if (type === 'dropdown') {
            setting.addDropdown(dropdown => {
                options.forEach(option => {
                    dropdown.addOption(option, option.charAt(0).toUpperCase() + option.slice(1));
                });
                dropdown
                    .setValue(targetObject[key])
                    .onChange(async (value) => {
                        targetObject[key] = value;
                        this.updatePreview();
                    });
            });
        }
    }

    /**
     * Helper function to create spacing settings.
     * @param {HTMLElement} containerEl - The container element.
     * @param {string} name - The setting name.
     * @param {string} key - The property key in the target object.
     * @param {object} targetObject - The object containing the spacing property.
     */
    createSpacingSetting(containerEl, name, key, targetObject) {
        const setting = new Setting(containerEl)
            .setName(name);

        setting.addText(text => text
            .setPlaceholder('e.g. 10px, 1em, 2%') // Translated
            .setValue(targetObject[key])
            .onChange(async (value) => {
                targetObject[key] = value;
                this.updatePreview();
            }));
    }
}


// --- Plugin Class ---

/**
 * The main class for the Global Menu plugin.
 * Manages loading settings, displaying the menu,
 * and update events.
 */
class GlobalMenuPlugin extends Plugin {
    constructor() {
        super(...arguments);
        this.settings = {};
        this.menuContainers = new Map(); 
        this.activeLeafChangeHandler = this.onActiveLeafChange.bind(this);
        this.menuUpdateTimeout = null;
    }

    async onload() {
        await this.loadSettings();

        this.app.workspace.on('active-leaf-change', this.activeLeafChangeHandler);
        this.registerEvent(this.app.workspace.on('layout-change', () => {
            this.scheduleMenuUpdate(50);
        }));
        this.registerEvent(this.app.vault.on('modify', (file) => {
            if (this.settings.autoRefresh && file instanceof TFile && file.extension === 'md') {
                this.scheduleMenuUpdate(100);
            }
        }));
        this.registerEvent(this.app.workspace.on('css-change', () => {
            this.scheduleMenuUpdate(100);
        }));
        this.registerEvent(this.app.workspace.on('resize', () => {
            this.scheduleMenuUpdate(100);
        }));

        this.addSettingTab(new GlobalMenuSettingTab(this.app, this));

        this.updateAllMenusDisplay();
    }

    onunload() {
        this.removeAllMenus();
        clearTimeout(this.menuUpdateTimeout);
    }

    /**
     * Loads plugin settings and merges them with default values.
     * Performs a deep merge for complex style settings.
     */
    async loadSettings() {
        const loadedData = await this.loadData();
        this.settings = Object.assign({}, DEFAULT_SETTINGS); 
    
        if (loadedData) {
            Object.keys(loadedData).forEach(key => {
                if (key === 'customLightStyle' || key === 'customDarkStyle' || key === 'typography' || key === 'spacingLayout') {
                    // Deep merge for nested style objects
                    this.settings[key] = {
                        ...DEFAULT_SETTINGS[key],
                        ...loadedData[key]
                    };
                    if (loadedData[key] && loadedData[key].typography) {
                        this.settings[key].typography = {
                            ...DEFAULT_SETTINGS[key].typography,
                            ...loadedData[key].typography
                        };
                    }
                    if (loadedData[key] && loadedData[key].spacingLayout) {
                        this.settings[key].spacingLayout = {
                            ...DEFAULT_SETTINGS[key].spacingLayout,
                            ...loadedData[key].spacingLayout
                        };
                    }
                } else {
                    this.settings[key] = loadedData[key];
                }
            });
        }

        let mainMenu = this.settings.menus.find(menu => menu.id === MAIN_MENU_ID);
        if (!mainMenu) {
            mainMenu = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.menus.find(menu => menu.id === MAIN_MENU_ID)));
            this.settings.menus.unshift(mainMenu);
        }

        let baseRule = this.settings.rules.find(rule => rule.id === BASE_RULE_ID);
        if (!baseRule) {
            baseRule = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.rules.find(rule => rule.id === BASE_RULE_ID)));
            this.settings.rules.push(baseRule);
        } else {
            Object.assign(baseRule, {
                enabled: baseRule.enabled !== undefined ? baseRule.enabled : true,
                type: 'all',
                value: '*',
                menuId: baseRule.menuId || MAIN_MENU_ID
            });
        }
    }

    /**
     * Saves current plugin settings and updates the display of ALL menus.
     */
    async saveSettings() {
        await this.saveData(this.settings);
        this.updateAllMenusDisplay();
    }

    /**
     * Handler for active leaf (panel) changes in the workspace.
     */
    onActiveLeafChange() {
        this.scheduleMenuUpdate(50);
    }

    /**
     * Removes a single menu associated with a specific leaf.
     * @param {string} leafId The ID of the leaf from which to remove the menu.
     */
    removeMenuForLeaf(leafId) {
        const menuContainer = this.menuContainers.get(leafId);
        if (menuContainer) {
            menuContainer.remove();
            this.menuContainers.delete(leafId);
        }
    }

    /**
     * Removes all existing menus from the DOM.
     */
    removeAllMenus() {
        this.menuContainers.forEach((menuContainer, leafId) => {
            menuContainer.remove();
        });
        this.menuContainers.clear();

        this.app.workspace.getLeavesOfType('markdown').forEach(leaf => {
            if (leaf.view && leaf.view.contentEl) {
                const viewHeader = leaf.view.contentEl.querySelector('.view-header');
                if (viewHeader) {
                    viewHeader.style.marginTop = '';
                }
                leaf.containerEl.removeAttribute('data-menu-position');
            }
        });
    }

    /**
     * Updates the menu display for ALL open Markdown tabs.
     */
    updateAllMenusDisplay() {
        this.removeAllMenus();

        if (this.settings.showMenuOnlyInActiveNote) {
            const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (activeView && activeView.file) {
                this.renderMenuForLeaf(activeView.leaf);
            }
        } else {
            this.app.workspace.getLeavesOfType('markdown').forEach(leaf => {
                if (leaf.view instanceof MarkdownView && leaf.view.file) {
                    this.renderMenuForLeaf(leaf);
                }
            });
        }
    }

    /**
     * Determines which menu should be displayed for a given leaf and renders it.
     * @param {MarkdownView} leaf The leaf for which to render the menu.
     */
    renderMenuForLeaf(leaf) {
        if (!leaf.view || !(leaf.view instanceof MarkdownView) || !leaf.view.file) {
            this.removeMenuForLeaf(leaf.id);
            return;
        }

        const currentFilePath = leaf.view.file.path;
        const currentFileBasename = leaf.view.file.basename;
        const currentFileTags = this.app.metadataCache.getFileCache(leaf.view.file)?.tags?.map(tag => tag.tag.substring(1)) || [];
        const currentFolderPath = leaf.view.file.parent.path === '/' ? '/' : leaf.view.file.parent.path + '/';

        let menuToDisplay = null;

        let rulesToProcess = JSON.parse(JSON.stringify(this.settings.rules));
        const baseRuleIndex = rulesToProcess.findIndex(r => r.id === BASE_RULE_ID);
        let baseRule = null;

        if (baseRuleIndex !== -1) {
            baseRule = rulesToProcess[baseRuleIndex];
            rulesToProcess.splice(baseRuleIndex, 1);
        }
        
        // Sort rules: note > tag > folder > regex > all
        rulesToProcess.sort((a, b) => {
            const typeOrder = ['note', 'tag', 'folder', 'regex', 'all'];
            const typeA = typeOrder.indexOf(a.type);
            const typeB = typeOrder.indexOf(b.type);

            if (typeA !== typeB) {
                return typeA - typeB;
            }

            const isASpecific = a.value !== '' && a.value !== '*';
            const isBSpecific = b.value !== '' && b.value !== '*';

            if (isASpecific && !isBSpecific) return -1;
            if (!isASpecific && isBSpecific) return 1;

            return 0;
        });

        for (const rule of rulesToProcess) {
            if (!rule.enabled) {
                continue;
            }

            let isMatch = false;
            switch (rule.type) {
                case 'all':
                    isMatch = true;
                    break;
                case 'tag':
                    isMatch = currentFileTags.includes(rule.value);
                    break;
                case 'folder':
                    if (rule.value === '') {
                        isMatch = currentFolderPath !== '/';
                    } else {
                        isMatch = currentFolderPath.startsWith(rule.value);
                    }
                    break;
                case 'note':
                    isMatch = currentFileBasename === rule.value;
                    break;
                case 'regex':
                    try {
                        const regex = new RegExp(rule.value);
                        isMatch = regex.test(currentFilePath);
                    } catch (e) {
                        isMatch = false;
                    }
                    break;
            }

            if (isMatch) {
                const foundMenu = this.settings.menus.find(menu => menu.id === rule.menuId);
                if (foundMenu && foundMenu.enabled && foundMenu.items.length > 0) {
                    menuToDisplay = foundMenu;
                    break;
                }
            }
        }

        if (!menuToDisplay && baseRule && baseRule.enabled) {
            const foundMenu = this.settings.menus.find(menu => menu.id === baseRule.menuId);
            if (foundMenu && foundMenu.enabled && foundMenu.items.length > 0) {
                menuToDisplay = foundMenu;
            }
        }

        if (!menuToDisplay || menuToDisplay.items.length === 0) {
            this.removeMenuForLeaf(leaf.id);
            return;
        }

        let menuContainer = this.menuContainers.get(leaf.id);
        if (menuContainer) {
            menuContainer.detach();
        } else {
            menuContainer = createDiv({ cls: 'global-menu-container' });
            this.menuContainers.set(leaf.id, menuContainer);
        }

        const targetLeafEl = leaf.containerEl;
        const viewHeader = targetLeafEl.querySelector('.view-header');
        const viewContent = targetLeafEl.querySelector('.view-content');


        if (this.settings.menuPosition === 'top') {
            if (viewHeader) {
                viewHeader.after(menuContainer);
            } else {
                targetLeafEl.prepend(menuContainer);
            }
        } else if (this.settings.menuPosition === 'bottom') {
            targetLeafEl.append(menuContainer);
            if (viewContent) {
                viewContent.style.flexGrow = '1';
                viewContent.style.overflowY = 'auto';
                viewContent.style.paddingBottom = `calc(${menuContainer.offsetHeight}px + 20px)`;
                const resizeObserver = new ResizeObserver(entries => {
                    for (let entry of entries) {
                        if (entry.target === menuContainer) {
                            if (viewContent.style.paddingBottom !== `calc(${menuContainer.offsetHeight}px + 20px)`) {
                                viewContent.style.paddingBottom = `calc(${menuContainer.offsetHeight}px + 20px)`;
                            }
                        }
                    }
                });
                resizeObserver.observe(menuContainer);
                this.register(() => resizeObserver.disconnect());
            }
        }
        
        menuContainer.addClass(MENU_POSITION_CLASSES[this.settings.menuPosition]);
        targetLeafEl.setAttribute('data-menu-position', this.settings.menuPosition);

        this.applyMenuStyle(menuContainer);

        menuContainer.empty();
        if (menuToDisplay.showMenuTitle && menuToDisplay.menuTitle) {
            this.createMenuTitleElement(menuContainer, menuToDisplay.menuTitle);
        }

        const menuList = menuContainer.createEl('ul', { cls: 'global-menu-list', tabindex: 0 });

        menuToDisplay.items.forEach(item => {
            if (item.enabled) {
                this.createMenuItemElement(menuList, item, leaf);
            }
        });

        // --- Keyboard Accessibility for menu items ---
        const menuItems = Array.from(menuList.querySelectorAll('li > a'));

        if (menuItems.length > 0) {
            menuList.addEventListener('focus', () => {
                if (document.activeElement === menuList) {
                    menuItems[0].focus();
                }
            });

            menuList.addEventListener('keydown', (e) => {
                const activeElement = document.activeElement;
                const currentIndex = menuItems.indexOf(activeElement);

                let nextIndex = -1;

                switch (e.key) {
                    case 'ArrowRight':
                    case 'ArrowDown':
                        nextIndex = (currentIndex + 1) % menuItems.length;
                        e.preventDefault();
                        break;
                    case 'ArrowLeft':
                    case 'ArrowUp':
                        nextIndex = (currentIndex - 1 + menuItems.length) % menuItems.length;
                        e.preventDefault();
                        break;
                    case 'Home':
                        nextIndex = 0;
                        e.preventDefault();
                        break;
                    case 'End':
                        nextIndex = menuItems.length - 1;
                        e.preventDefault();
                        break;
                }

                if (nextIndex !== -1 && menuItems[nextIndex]) {
                    menuItems[nextIndex].focus();
                }
            });
        }
    }

    /**
     * Creates and appends the menu title element.
     * @param {HTMLElement} parentEl - The parent element to append the title to.
     * @param {string} titleText - The title text.
     */
    createMenuTitleElement(parentEl, titleText) {
        parentEl.createEl('div', { text: titleText, cls: 'global-menu-title' });
    }

    /**
     * Creates and appends a single menu item.
     * @param {HTMLElement} parentEl - The parent element (ul list) to append the item to.
     * @param {object} item - The menu item object (name, type, value, newTab).
     * @param {MarkdownView} leaf - The current leaf.
     */
    createMenuItemElement(parentEl, item, leaf) {
        const listItem = parentEl.createEl('li', { cls: 'global-menu-item' });
        const link = listItem.createEl('a', { text: item.name, href: '#', attr: { 'aria-label': item.name, tabindex: 0 } });

        let openInNewTab;
        if (this.settings.openLinksInNewTab) {
            openInNewTab = true;
        } else {
            openInNewTab = (item.newTab === true); 
        }

        link.onclick = (e) => {
            e.preventDefault();
            if (item.type === 'note') {
                this.app.workspace.openLinkText(item.value, '/', openInNewTab);
            } else if (item.type === 'command') {
                this.app.commands.executeCommandById(item.value);
            }
            this.scheduleMenuUpdate(50);
        };

        link.onauxclick = (e) => {
            if (e.button === 1) {
                e.preventDefault();
                if (item.type === 'note') {
                    this.app.workspace.openLinkText(item.value, '/', true); 
                }
            }
            this.scheduleMenuUpdate(50);
        };

        link.oncontextmenu = (e) => {
            e.preventDefault();
            if (item.type === 'note') {
                this.app.workspace.openLinkText(item.value, '/', true);
            }
            this.scheduleMenuUpdate(50);
        };
    }

    /**
     * Applies style settings (colors, typography, spacing) to an element.
     * @param {HTMLElement} element - The HTML element to apply styles to.
     * @param {object} [settingsOverride=null] - Optional settings to use instead of this.settings (useful for preview).
     */
    applyMenuStyle(element, settingsOverride = null) {
        const effectiveSettings = settingsOverride || this.settings;

        element.removeClass(
            'global-menu-light',
            'global-menu-dark',
            'global-menu-custom', 
            'global-menu-auto-system',
            'global-menu-custom-light',
            'global-menu-custom-dark',
            'global-menu-auto-base-light-dark' // New class for new option
        );
        element.removeAttribute('style'); // Clear inline styles

        let activeStyleConfig = null; 
        let isCustomMode = false;
        let colorsToApply; // This will hold the specific color values to apply

        switch (effectiveSettings.menuStyle) {
            case 'auto-custom':
                const isDarkMode = document.body.classList.contains('theme-dark');
                activeStyleConfig = isDarkMode ? effectiveSettings.customDarkStyle : effectiveSettings.customLightStyle;
                isCustomMode = true; // Use custom typography and spacing from activeStyleConfig
                element.addClass('global-menu-custom'); 
                colorsToApply = activeStyleConfig; // Colors are from the active custom style
                break;
            case 'custom-light':
                activeStyleConfig = effectiveSettings.customLightStyle;
                isCustomMode = true; // Use custom typography and spacing from activeStyleConfig
                element.addClass('global-menu-custom-light'); 
                colorsToApply = activeStyleConfig; // Colors are from the custom light style
                break;
            case 'custom-dark':
                activeStyleConfig = effectiveSettings.customDarkStyle;
                isCustomMode = true; // Use custom typography and spacing from activeStyleConfig
                element.addClass('global-menu-custom-dark'); 
                colorsToApply = activeStyleConfig; // Colors are from the custom dark style
                break;
            case 'light': // Apply fixed light theme colors
                element.addClass('global-menu-light');
                colorsToApply = {
                    menuBg: '#ffffff',
                    menuText: '#333333',
                    menuBorder: '#e1e1e1',
                    menuHover: '#f5f5f5',
                    menuAccent: '#007bff'
                };
                // For 'light' and 'dark' (non-custom modes), typography and spacing come from effectiveSettings.typography/spacingLayout directly
                activeStyleConfig = null; // No activeStyleConfig for system light/dark, so typography/spacing defaults to global
                break;
            case 'dark': // Apply fixed dark theme colors
                element.addClass('global-menu-dark');
                colorsToApply = {
                    menuBg: '#2b2b2b',
                    menuText: '#dddddd',
                    menuBorder: '#444444',
                    menuHover: '#3c3c3c',
                    menuAccent: '#bb86fc'
                };
                // For 'light' and 'dark' (non-custom modes), typography and spacing come from effectiveSettings.typography/spacingLayout directly
                activeStyleConfig = null; // No activeStyleConfig for system light/dark, so typography/spacing defaults to global
                break;
            case 'auto-base-light-dark': // NEW: Auto-select based on Obsidian theme, using fixed light/dark colors
                element.addClass('global-menu-auto-base-light-dark');
                const isObsidianDarkMode = document.body.classList.contains('theme-dark');
                colorsToApply = isObsidianDarkMode ? 
                    { // Fixed Dark colors
                        menuBg: '#2b2b2b',
                        menuText: '#dddddd',
                        menuBorder: '#444444',
                        menuHover: '#3c3c3c',
                        menuAccent: '#bb86fc'
                    } : 
                    { // Fixed Light colors
                        menuBg: '#ffffff',
                        menuText: '#333333',
                        menuBorder: '#e1e1e1',
                        menuHover: '#f5f5f5',
                        menuAccent: '#007bff'
                    };
                activeStyleConfig = null; // Typography and spacing from global settings
                break;
            case 'auto-system':
            default: // Default case is 'auto-system'
                element.addClass('global-menu-auto-system');
                colorsToApply = {
                    menuBg: 'var(--background-primary)',
                    menuText: 'var(--text-normal)',
                    menuBorder: 'var(--background-modifier-border)',
                    menuHover: 'var(--background-modifier-hover)',
                    menuAccent: 'var(--interactive-accent)'
                };
                activeStyleConfig = null; // No activeStyleConfig for auto-system, so typography/spacing defaults to global
                break;
        }

        // Determine typography and spacing to apply
        // If activeStyleConfig exists (meaning it's a custom mode, or auto-custom), use its nested typography/spacing.
        // Otherwise (for system/fixed light/dark/auto-base modes), use the global typography/spacing from effectiveSettings.
        const spacingToApply = (activeStyleConfig && activeStyleConfig.spacingLayout) ? activeStyleConfig.spacingLayout : effectiveSettings.spacingLayout;
        const typographyToApply = (activeStyleConfig && activeStyleConfig.typography) ? activeStyleConfig.typography : effectiveSettings.typography;

        // Apply spacing and typography variables as inline styles
        element.style.setProperty('--global-menu-padding', spacingToApply.menuPadding);
        element.style.setProperty('--global-menu-item-padding', spacingToApply.itemPadding);
        element.style.setProperty('--global-menu-item-gap', spacingToApply.itemGap);
        element.style.setProperty('--global-menu-border-radius', spacingToApply.borderRadius);
        element.style.setProperty('--global-menu-border-width', spacingToApply.menuBorderWidth);
        element.style.setProperty('--global-menu-container-border-radius', spacingToApply.menuBorderRadius);

        element.style.setProperty('--global-menu-font-family', typographyToApply.fontFamily);
        element.style.setProperty('--global-menu-font-size', typographyToApply.fontSize);
        element.style.setProperty('--global-menu-font-weight', typographyToApply.fontWeight);
        element.style.setProperty('--global-menu-text-transform', typographyToApply.textTransform);
        element.style.setProperty('--global-menu-title-font-family', typographyToApply.titleFontFamily);
        element.style.setProperty('--global-menu-title-font-size', typographyToApply.titleFontSize);
        element.style.setProperty('--global-menu-title-font-weight', typographyToApply.titleFontWeight);
        element.style.setProperty('--global-menu-title-text-transform', typographyToApply.titleTextTransform);

        // Always apply colors as inline styles
        element.style.setProperty('--global-menu-bg', colorsToApply.menuBg);
        element.style.setProperty('--global-menu-text', colorsToApply.menuText);
        element.style.setProperty('--global-menu-border', colorsToApply.menuBorder);
        element.style.setProperty('--global-menu-hover-bg', colorsToApply.menuHover);
        element.style.setProperty('--global-menu-accent', colorsToApply.menuAccent);
    }

    /**
     * Schedules a menu update with a debounce to prevent excessive updates.
     * @param {number} delay - The delay in ms before the update.
     */
    scheduleMenuUpdate(delay = 50) {
        clearTimeout(this.menuUpdateTimeout);
        this.menuUpdateTimeout = setTimeout(() => {
            this.updateAllMenusDisplay();
            this.menuUpdateTimeout = null;
        }, delay);
    }
}

// --- Settings Tab Class ---

/**
 * The settings tab class for the plugin.
 * Allows users to configure menus, rules, and styles.
 */
class GlobalMenuSettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        // Save current scroll position
        const scrollPos = containerEl.scrollTop;

        containerEl.empty();
        containerEl.createEl('h2', { text: 'Global Menu Settings' }); // Translated

        // --- Global Menu Appearance & Behavior ---
        containerEl.createEl('h3', { text: 'Global Behavior' }); // Translated

        new Setting(containerEl)
            .setName('Menu Position') // Translated
            .setDesc('Where the menu should be displayed within the note content. Currently, only "Top" and "Bottom" are fully supported.') // Translated
            .addDropdown(dropdown => dropdown
                .addOption('top', 'Top (above title)') // Translated
                .addOption('bottom', 'Bottom (below content)') // Translated
                .setValue(this.plugin.settings.menuPosition)
                .onChange(async (value) => {
                    this.plugin.settings.menuPosition = value;
                    await this.plugin.saveSettings();
                    this.display(); // Re-render to apply new position class and preserve scroll
                }));

        new Setting(containerEl)
            .setName('Auto-Refresh Menu') // Translated
            .setDesc('Automatically refresh the menu when a note is opened or modified. Disable if you experience performance issues.') // Translated
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoRefresh)
                .onChange(async (value) => {
                    this.plugin.settings.autoRefresh = value;
                    await this.plugin.saveSettings();
                    this.display(); // Re-render to preserve scroll
                }));
        
        new Setting(containerEl)
            .setName('Open Notes in New Tab by Default') // Translated
            .setDesc('If enabled, notes opened from the menu will open in a new tab by default. Individual menu items can override this setting.') // Translated
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.openLinksInNewTab)
                .onChange(async (value) => {
                    this.plugin.settings.openLinksInNewTab = value;
                    await this.plugin.saveSettings();
                    this.display(); // Re-render to preserve scroll
                }));
        
        new Setting(containerEl)
            .setName('Show Menu Only in Active Note') // Translated
            .setDesc('If enabled, the menu will only appear in the currently active note pane. If disabled, it will appear in all open note panes.') // Translated
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showMenuOnlyInActiveNote)
                .onChange(async (value) => {
                    this.plugin.settings.showMenuOnlyInActiveNote = value;
                    await this.plugin.saveSettings();
                    this.display(); // Re-render to preserve scroll
                }));


        // --- Customization Section ---
        containerEl.createEl('h3', { text: 'Customization' }); // Translated

        const styleSetting = new Setting(containerEl)
            .setName('Menu Style') // Translated
            .setDesc('Choose and customize the visual theme of the menu.') // Translated
            .addDropdown(dropdown => dropdown
                .addOption('auto-system', 'Auto (system colors)') // Updated name
                .addOption('auto-base-light-dark', 'Auto (base light and dark mode)') // New option
                .addOption('light', 'Always Light') // Updated name
                .addOption('dark', 'Always Dark') // Updated name
                .addOption('auto-custom', 'Auto (Custom Colors)') // Updated name
                .addOption('custom-light', 'Custom Light') // Translated
                .addOption('custom-dark', 'Custom Dark') // Translated
                .setValue(this.plugin.settings.menuStyle)
                .onChange(async (value) => {
                    this.plugin.settings.menuStyle = value;
                    await this.plugin.saveSettings(); // Save immediately when style changes
                    this.display(); // Re-render to show correct edit modal options, preserving scroll
                }));
        
        styleSetting.addButton(btn => btn
            .setButtonText('Edit') // Translated
            .setIcon('pencil')
            .onClick(() => {
                // Pass current plugin settings directly to the modal
                new MenuStyleModal(this.app, this.plugin, this.plugin.settings, async (updatedStyleSettings) => {
                    // Update plugin settings with the values returned from the modal
                    this.plugin.settings.menuStyle = updatedStyleSettings.menuStyle;
                    this.plugin.settings.customLightStyle = updatedStyleSettings.customLightStyle;
                    this.plugin.settings.customDarkStyle = updatedStyleSettings.customDarkStyle;
                    this.plugin.settings.typography = updatedStyleSettings.typography;
                    this.plugin.settings.spacingLayout = updatedStyleSettings.spacingLayout;
                    
                    await this.plugin.saveSettings();
                    this.display(); // Re-render main settings tab
                }).open();
            }));


        // --- Menu Management ---
        containerEl.createEl('h3', { text: 'Menu Management' }); // Translated
        containerEl.createEl('p', { text: 'Manage your custom menus and their content.' }); // Translated


        new Setting(containerEl)
            .setName('Create New Menu') // Translated
            .addButton(btn => btn
                .setButtonText('New Menu') // Translated
                .setCta()
                .onClick(async () => {
                    const newMenuId = `menu-${Date.now()}`;
                    const newMenu = {
                        id: newMenuId,
                        name: `New Menu ${this.plugin.settings.menus.length + 1}`, // Translated
                        enabled: true,
                        showMenuTitle: true,
                        menuTitle: 'New Menu Title', // Translated
                        items: []
                    };
                    new MenuEditorModal(this.app, this.plugin, newMenu, async (updatedMenu) => {
                        if (updatedMenu.items.length === 0) {
                            new Notice('A menu must contain at least one item.', 3000); // Translated
                            return;
                        }
                        this.plugin.settings.menus.push(updatedMenu);
                        await this.plugin.saveSettings();
                        this.display(); // Re-render main settings tab
                    }).open();
                }));

        // Display and manage all menus (including Main Menu)
        this.plugin.settings.menus.forEach((menu) => {
            const isMainMenu = (menu.id === MAIN_MENU_ID);
            const menuEntryEl = containerEl.createEl('div', { cls: 'global-menu-menu-entry' });

            new Setting(menuEntryEl)
                .setName(isMainMenu ? `Main Menu (${menu.name})` : menu.name) // Translated
                .setDesc(`ID: ${menu.id}`)
                .addButton(btn => btn
                    .setButtonText('Edit') // Translated
                    .setIcon('pencil')
                    .onClick(() => {
                        new MenuEditorModal(this.app, this.plugin, menu, async (updatedMenu) => {
                            const index = this.plugin.settings.menus.findIndex(m => m.id === updatedMenu.id);
                            if (index !== -1) {
                                this.plugin.settings.menus[index] = updatedMenu;
                                await this.plugin.saveSettings();
                                this.display();
                            }
                        }, isMainMenu).open();
                    }))
                .addButton(btn => btn
                    .setButtonText('Clone') // Translated
                    .setIcon('copy')
                    .onClick(async () => {
                        const clonedMenu = JSON.parse(JSON.stringify(menu));
                        clonedMenu.id = `menu-${Date.now()}-clone`;
                        clonedMenu.name = `${menu.name} (Cloned)`; // Translated
                        this.plugin.settings.menus.push(clonedMenu);
                        await this.plugin.saveSettings();
                        this.display();
                    }))
                .addButton(btn => btn
                    .setButtonText('Remove') // Translated
                    .setIcon('trash')
                    .setWarning()
                    .setDisabled(isMainMenu)
                    .setTooltip(isMainMenu ? 'The Main Menu cannot be removed.' : 'Remove this menu.') // Translated
                    .onClick(async () => {
                        new CustomConfirmModal(this.app, 'Confirm Removal', `Are you sure you want to remove menu "${menu.name}"? All rules pointing to this menu will be reassigned to the "Main Menu".`, async () => { // Translated
                            this.plugin.settings.rules.forEach(rule => {
                                if (rule.menuId === menu.id) {
                                    rule.menuId = MAIN_MENU_ID;
                                }
                            });
                            this.plugin.settings.menus = this.plugin.settings.menus.filter(m => m.id !== menu.id);
                            
                            await this.plugin.saveSettings();
                            this.display();
                        }, () => {
                        }).open();
                    }));
        });


        // --- Rule Management ---
        containerEl.createEl('h3', { text: 'Rule Management' }); // Translated
        containerEl.createEl('p', { text: 'Rules define which menu is displayed based on note properties. Rules are processed from top to bottom. The first enabled rule that matches determines the menu displayed.' }); // Translated

        new Setting(containerEl)
            .setName('Add New Rule') // Translated
            .addButton(btn => btn
                .setButtonText('Add Rule') // Translated
                .setCta()
                .onClick(async () => {
                    const newRuleId = `rule-${Date.now()}`;
                    const newRule = {
                        id: newRuleId,
                        enabled: true,
                        type: 'all',
                        value: '',
                        menuId: this.plugin.settings.menus[0]?.id || ''
                    };

                    this.plugin.settings.rules.unshift(newRule);
                    
                    await this.plugin.saveSettings();
                    this.display();
                }));

        const rulesToDisplay = this.plugin.settings.rules.filter(rule => rule.id !== BASE_RULE_ID);
        const baseRule = this.plugin.settings.rules.find(rule => rule.id === BASE_RULE_ID);

        rulesToDisplay.forEach((rule, ruleIndex) => {
            const ruleSetting = new Setting(containerEl)
                .setClass('global-menu-rule-setting');

            ruleSetting.setName(`Rule ${rulesToDisplay.length - ruleIndex}`); // Translated

            ruleSetting.addToggle(toggle => toggle
                .setTooltip('Enable/Disable this rule') // Translated
                .setValue(rule.enabled)
                .onChange(async (value) => {
                    rule.enabled = value;
                    await this.plugin.saveSettings();
                    this.display(); // Re-render to preserve scroll
                }));

            ruleSetting.addDropdown(dropdown => dropdown
                .addOption('all', 'All Notes') // Translated
                .addOption('tag', 'Notes with Tag') // Translated
                .addOption('folder', 'Notes in Folder') // Translated
                .addOption('note', 'Specific Note') // Translated
                .addOption('regex', 'Regex Match') // Translated
                .setValue(rule.type)
                .onChange(async (value) => {
                    rule.type = value;
                    rule.value = (value === 'all' || value === 'regex') ? rule.value : '';
                    await this.plugin.saveSettings();
                    this.display(); // Re-render to show appropriate input and preserve scroll
                }));

            if (rule.type === 'tag') {
                let tagTextInput;
                ruleSetting.addText(text => {
                    tagTextInput = text;
                    text
                        .setPlaceholder('Tag (e.g. my-tag, without #)') // Translated
                        .setValue(rule.value)
                        .onChange(async (value) => {
                            rule.value = value.startsWith('#') ? value.substring(1) : value;
                            await this.plugin.saveSettings();
                            this.display(); // Re-render to preserve scroll
                        });
                });
                ruleSetting.addButton(btn => btn
                    .setIcon('hashtag')
                    .setTooltip('Choose a tag') // Translated
                    .onClick(() => {
                        new TagSuggestModal(this.app, (selected) => {
                            rule.value = selected;
                            if (tagTextInput) {
                                tagTextInput.setValue(selected);
                            }
                            this.plugin.saveSettings();
                            this.display(); // Re-render to preserve scroll
                        }).open();
                    }));
            } else if (rule.type === 'folder') {

                let folderTextInput;
                ruleSetting.addText(text => {
                    folderTextInput = text;
                    text
                        .setPlaceholder('Folder path (e.g. folder/subfolder/)') // Translated
                        .setValue(rule.value)
                        .onChange(async (value) => {
                            rule.value = value.endsWith('/') || value === '' ? value : value + '/';
                            await this.plugin.saveSettings();
                            this.display(); // Re-render to preserve scroll
                        });
                });
                ruleSetting.addButton(btn => btn
                    .setIcon('folder')
                    .setTooltip('Choose a folder') // Translated
                    .onClick(() => {
                        new FolderSuggestModal(this.app, (selected) => {
                            rule.value = selected;
                            if (folderTextInput) {
                                folderTextInput.setValue(selected);
                            }
                            this.plugin.saveSettings();
                            this.display(); // Re-render to preserve scroll
                        }).open();
                    }));
            } else if (rule.type === 'note') {
                let noteTextInput;
                ruleSetting.addText(text => {
                    noteTextInput = text;
                    text
                        .setPlaceholder('Note name (e.g. My Specific Note)') // Translated
                        .setValue(rule.value)
                        .onChange(async (value) => {
                            rule.value = value;
                            await this.plugin.saveSettings();
                            this.display(); // Re-render to preserve scroll
                        });
                });
                ruleSetting.addButton(btn => btn
                    .setIcon('file-text')
                    .setTooltip('Choose a note') // Translated
                    .onClick(() => {
                        new FileSuggestModal(this.app, (selected) => {
                            rule.value = selected.name;
                            if (noteTextInput) {
                                noteTextInput.setValue(selected.name);
                            }
                            this.plugin.saveSettings();
                            this.display(); // Re-render to preserve scroll
                        }).open();
                    }));
            } else if (rule.type === 'regex') {
                let regexTextInput;
                ruleSetting.addText(text => {
                    regexTextInput = text;
                    text
                        .setPlaceholder('Regular Expression (e.g. ^Daily Notes/2023-.*$)') // Translated
                        .setValue(rule.value)
                        .onChange(async (value) => {
                            rule.value = value;
                            await this.plugin.saveSettings();
                            this.display(); // Re-render to preserve scroll
                        });
                });
            } else if (rule.type === 'all') {
                ruleSetting.setDesc('This rule applies to all notes.'); // Translated
                rule.value = '*';
            }

            ruleSetting.addDropdown(dropdown => {
                if (this.plugin.settings.menus.length === 0) {
                    dropdown.addOption('', 'No menus available'); // Translated
                    dropdown.setDisabled(true);
                } else {
                    this.plugin.settings.menus.forEach(menu => {
                        dropdown.addOption(menu.id, menu.name);
                    });
                    dropdown.setValue(rule.menuId || this.plugin.settings.menus[0]?.id || '');
                }
                dropdown.onChange(async (value) => {
                    rule.menuId = value;
                    await this.plugin.saveSettings();
                    this.display(); // Re-render to preserve scroll
                });
            });

            ruleSetting.addButton(btn => btn
                .setIcon('arrow-up')
                .setTooltip('Move up (higher priority)') // Translated
                .setDisabled(ruleIndex === 0)
                .onClick(async () => {
                    if (ruleIndex > 0) {
                        const currentRules = this.plugin.settings.rules.filter(r => r.id !== BASE_RULE_ID);
                        const baseRuleObj = this.plugin.settings.rules.find(r => r.id === BASE_RULE_ID);
                        
                        const [movedRule] = currentRules.splice(ruleIndex, 1);
                        currentRules.splice(ruleIndex - 1, 0, movedRule);
                        
                        this.plugin.settings.rules = currentRules;
                        if (baseRuleObj) {
                            this.plugin.settings.rules.push(baseRuleObj);
                        }

                        await this.plugin.saveSettings();
                        this.display(); // Re-render to show updated order and preserve scroll
                    }
                }));

            ruleSetting.addButton(btn => btn
                .setIcon('arrow-down')
                .setTooltip('Move down (lower priority)') // Translated
                .setDisabled(ruleIndex === rulesToDisplay.length - 1)
                .onClick(async () => {
                    if (ruleIndex < rulesToDisplay.length - 1) {
                        const currentRules = this.plugin.settings.rules.filter(r => r.id !== BASE_RULE_ID);
                        const baseRuleObj = this.plugin.settings.rules.find(r => r.id === BASE_RULE_ID);

                        const [movedRule] = currentRules.splice(ruleIndex, 1);
                        currentRules.splice(ruleIndex + 1, 0, movedRule);

                        this.plugin.settings.rules = currentRules;
                        if (baseRuleObj) {
                            this.plugin.settings.rules.push(baseRuleObj);
                        }

                        await this.plugin.saveSettings();
                        this.display(); // Re-render to show updated order and preserve scroll
                    }
                }));

            ruleSetting.addButton(btn => btn
                .setButtonText('Remove') // Translated
                .setIcon('trash')
                .setWarning()
                .onClick(async () => {
                    new CustomConfirmModal(this.app, 'Confirm Removal', `Are you sure you want to remove rule ${ruleIndex + 1}?`, async () => { // Translated
                        this.plugin.settings.rules = this.plugin.settings.rules.filter(r => r.id !== rule.id);
                        await this.plugin.saveSettings();
                        this.display(); // Re-render settings tab
                    }, () => {
                    }).open();
                }));
        });

        // --- Base Rule Management ---
        if (baseRule) {
            containerEl.createEl('hr');
            const baseRuleSettingSection = containerEl.createEl('div', { cls: 'global-menu-base-rule-section' });
            baseRuleSettingSection.createEl('h4', { text: 'Rule 0: Fallback Menu (Applies to All Notes)' }); // Translated
            baseRuleSettingSection.createEl('p', { text: 'This rule acts as a fallback. If no other rule matches an active note, this rule determines which menu is displayed.' }); // Translated


            new Setting(baseRuleSettingSection)
                .setName('Enabled') // Translated
                .setDesc('If disabled, no menu will be shown for notes that do not match any other rule above.') // Translated
                .addToggle(toggle => toggle
                    .setValue(baseRule.enabled)
                    .onChange(async (value) => {
                        baseRule.enabled = value;
                        await this.plugin.saveSettings();
                        this.display(); // Re-render to preserve scroll
                    }));

            new Setting(baseRuleSettingSection)
                .setName('Assigned Menu') // Translated
                .setDesc('Select which menu this fallback rule should apply.') // Translated
                .addDropdown(dropdown => {
                    if (this.plugin.settings.menus.length === 0) {
                        dropdown.addOption('', 'No menus available'); // Translated
                        dropdown.setDisabled(true);
                    } else {
                        this.plugin.settings.menus.forEach(menu => {
                            dropdown.addOption(menu.id, menu.name);
                        });
                        dropdown.setValue(baseRule.menuId);
                    }
                    dropdown.onChange(async (value) => {
                        baseRule.menuId = value;
                        await this.plugin.saveSettings();
                        this.display(); // Re-render to preserve scroll
                    });
                });
        }


        // --- Reset All Settings ---
        containerEl.createEl('h3', { text: 'Reset All Settings' }); // Translated
        new Setting(containerEl)
            .setName('Reset to default values') // Translated
            .setDesc('Warning: This will clear all your custom menus and rules, except for the default Main Menu and its base rule.') // Translated
            .addButton(btn => btn
                .setButtonText('Reset All') // Translated
                .setWarning()
                .onClick(async () => {
                    new CustomConfirmModal(this.app, 'Confirm Reset', 'Are you sure you want to reset all settings to their default values? This action cannot be undone.', async () => { // Translated
                        this.plugin.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));

                        let mainMenu = this.plugin.settings.menus.find(menu => menu.id === MAIN_MENU_ID);
                        if (!mainMenu) {
                            mainMenu = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.menus.find(menu => menu.id === MAIN_MENU_ID)));
                            this.plugin.settings.menus.unshift(mainMenu);
                        }

                        let baseRule = this.plugin.settings.rules.find(rule => rule.id === BASE_RULE_ID);
                        if (!baseRule) {
                            baseRule = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.rules.find(menu => menu.id === BASE_RULE_ID)));
                            this.plugin.settings.rules.push(baseRule);
                        } else {
                            Object.assign(baseRule, {
                                enabled: true,
                                type: 'all',
                                value: '*',
                                menuId: MAIN_MENU_ID
                            });
                        }

                        await this.plugin.saveSettings();
                        this.display();
                    }, () => {
                    }).open();
                }));
        
        // Restore scroll position after rendering
        setTimeout(() => containerEl.scrollTop = scrollPos, 0);
    }
}

/**
 * Custom confirmation modal to replace alert()/confirm().
 */
class CustomConfirmModal extends Modal {
    constructor(app, title, message, onConfirm, onCancel) {
        super(app);
        this.title = title;
        this.message = message;
        this.onConfirm = onConfirm;
        this.onCancel = onCancel;
        this.titleEl.setText(this.title);
        this.modalEl.addClass('global-menu-confirm-modal');
    }

    onOpen() {
        let { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('p', { text: this.message });

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('Confirm') // Translated
                .setCta()
                .onClick(() => {
                    this.onConfirm();
                    this.close();
                }))
            .addButton(btn => btn
                .setButtonText('Cancel') // Translated
                .onClick(() => {
                    this.onCancel();
                    this.close();
                }));
    }

    onClose() {
        let { contentEl } = this;
        contentEl.empty();
    }
}

module.exports = GlobalMenuPlugin;
# Obsidian Global Menu Plugin
The Obsidian Global Menu Plugin is a powerful tool designed to enhance your note-taking experience by providing a customizable and always-visible navigation menu within your Obsidian vaults. Say goodbye to endless searching and welcome seamless access to your most important notes or commands, right where you need them.

--------
## Features

### 1\. Customizable Menus

Create multiple menus, each tailored to a specific purpose or workflow. Assign unique names and titles, and enable or disable them as needed.

*   **Main Menu**: A default, unremovable menu that serves as your primary navigation.
    
*   **Unlimited Custom Menus**: Add as many additional menus as you require for different contexts (e.g., "Project X Menu", "Daily Tasks Menu").
    

### 2\. Flexible Menu Items

Each menu can contain a variety of items, giving you precise control over your navigation.

*   **Notes**: Link directly to any Markdown note in your vault. Choose whether to open them in the current tab or a new one.
    
*   **Commands**: Execute any Obsidian command directly from the menu. Perfect for quickly triggering frequently used actions.
    
*   **Drag-and-Drop Ordering**: Easily reorder menu items within a menu using a simple drag-and-drop interface.
    
*   **Enable/Disable Individual Items**: Temporarily hide menu items without deleting them.
    

### 3\. Dynamic Rule-Based Display

Control which menu appears based on the active note's properties. Rules are processed in priority order, from top to bottom.

*   **Rule Types**:
    
    *   **All Notes**: Apply a menu to every note.
        
    *   **Notes with Tag**: Display a menu only when a specific tag is present in the note.
        
    *   **Notes in Folder**: Show a menu for notes residing in a particular folder or its subfolders.
        
    *   **Specific Note**: Link a menu to a single, designated note.
        
    *   **Regex Match**: Use advanced regular expressions to match note paths for highly flexible rule creation.
        
*   **Rule Priority**: Reorder rules with "Move Up" and "Move Down" buttons to set their precedence.
    
*   **Fallback Menu**: A base rule (Rule 0) ensures that a default menu is always available if no other rules match.
    

### 4\. Extensive Style Customization

Tailor the menu's appearance to perfectly match your Obsidian theme and personal preferences.

*   **Menu Positioning**: Choose to display the menu at the Top (above the note title) or Bottom (below the note content) of your active pane.
    
*   **Multiple Style Modes**:
    
    *   **Auto (system colors)**: Automatically adapts to your Obsidian light/dark theme.
        
    *   **Auto (base light and dark mode)**: Auto-switches between predefined light and dark color palettes.
        
    *   **Always Light**: Forces the menu to always use a light menu, regardless of Obsidian's system theme.
        
    *   **Always Dark**: Forces the menu to always use a dark menu, regardless of Obsidian's system theme.
        
    *   **Auto (Custom Colors)**: Automatically switches between your custom light and dark color settings based on Obsidian's theme.
        
    *   **Custom Light / Custom Dark**: Define your own precise color schemes for light and dark modes.
        
*   **Detailed Customization Categories**:
    
    *   **Typography**: Adjust font family, size, weight, and text transformation for both menu items and the menu title.
        
    *   **Spacing and Layout**: Fine-tune padding for the menu and its items, control spacing between items, and set border-radius values.
        
    *   **Colors**: For custom modes, pick exact colors for the background, text, borders, hover states, and accent elements.
        
*   **Live Preview**: See your style changes in real-time within the settings modal, ensuring a perfect look before saving.
    

### 5\. Responsive Design

The menu is designed to be responsive (space for improvement), adapting to different screen sizes and orientations, from desktop to mobile.

### 6\. Accessibility (not tested)

*   **Keyboard Navigation**: Navigate through menu items using arrow keys (Left/Right or Up/Down) and activate them with Enter.
    
*   **Tabindex Support**: Ensure focusability for assistive technologies.
    
--------
## Manual Installation
1.  **Download**:
    
    *   Download the plugin folder from the latest release.
        
2.  **Obsidian Vault**:
    
    *   Open your Obsidian vault.
        
    *   Go to Settings -> Community plugins.
        
    *   Turn off Restricted mode (if active).
        
    *   Move the folder named global-menu inside your vault's .obsidian/plugins/ directory.
        
    *   Make sure the main.js and styles.css files are into this global-menu folder.
        
    *   Go back to Community plugins in Settings.
        
    *   Under Installed plugins, enable "Global Menu".
        
3.  **Configuration**:
    
    *   Click the gear icon next to "Global Menu" in the Community plugins list to access its settings.
        
--------
## Usage
1.  **Access Settings**: Go to Settings -> Global Menu in Obsidian.
    
2.  **Create Menus**: In the "Menu Management" section, add and configure your custom menus and their items.
    
3.  **Define Rules**: In the "Rule Management" section, set up rules to determine when each menu should be displayed.
    
4.  **Customize Style**: In the "Customization" section, fine-tune the menu's appearance.
    
--------
## Contributing
This plugin started as a "vibe coding" session because I genuinely needed this functionality, even though I hadn't coded in years. What began as a simple idea quickly evolved, and I found myself diving deeper into its development. Your ideas, bug reports, and pull requests are highly welcome! If you'd like to contribute, please feel free to fork the repository and submit a pull request.

--------
## License
This project is licensed under the MIT License

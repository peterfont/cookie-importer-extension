# Cookie Importer Extension

## Overview
The Cookie Importer Extension is a Chrome extension designed to facilitate the import of cookies into the browser. This extension allows users to easily read cookie data from a specified source and import it into their browser, enhancing their browsing experience.

## Features
- **Background Script**: Handles interactions with the browser and listens for events.
- **Popup Interface**: Provides a user-friendly interface for cookie import operations.
- **Cookie Parsing**: Utilizes utility functions to parse and manage cookie data.
- **Storage Management**: Interacts with the browser's storage API to save and retrieve cookie data.
- **Content Scripts**: Executes logic on web pages to manipulate the DOM as needed.

## Project Structure
```
cookie-importer-extension
├── src
│   ├── background
│   │   └── background.js
│   ├── popup
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   ├── utils
│   │   ├── cookie-parser.js
│   │   └── storage-helper.js
│   └── content-scripts
│       └── content.js
├── assets
│   └── icons
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
├── manifest.json
├── package.json
└── README.md
```

## Installation
1. Clone the repository or download the source code.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable "Developer mode" in the top right corner.
4. Click on "Load unpacked" and select the `cookie-importer-extension` directory.

## Usage
- Click on the extension icon in the Chrome toolbar to open the popup interface.
- Follow the instructions in the popup to import cookies from your desired source.

## Contributing
Contributions are welcome! Please feel free to submit a pull request or open an issue for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for more details.
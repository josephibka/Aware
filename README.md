# Aware

Aware is a local browser extension for inspecting web content that could mislead AI agents. It is designed to surface evidence and warnings, not to certify a page as safe or malicious.

## Extension shell

This branch contains the Chrome Manifest V3 popup and the local scan request flow. The page scanner is developed separately and supplies the injected `content.js` handler.

## Build

Requires Node.js and npm.

```sh
npm install
npm run build
```

Then open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the generated `dist` directory.

## Privacy and permissions

The extension uses only `activeTab` and `scripting`. It asks for access to the current tab when the user opens the popup and starts a scan. It does not upload or persist page content.

The popup renders finding text with DOM text nodes. The report shape used between the scanner and popup is:

- `ScanReport`: `url`, `scannedAt`, and `findings`
- `Finding`: `id`, `category`, `severity`, `title`, `description`, and `evidence`, with optional `selector` and `reason`

## Limits

A scan only reports signals covered by the current checks. A clean report does not prove that a page is safe, and an alert does not prove malicious intent. This extension shell does not yet provide an agent-runtime integration; it is the interface for a local page scan.

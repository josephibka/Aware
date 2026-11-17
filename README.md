# Aware

Aware is a local browser extension for inspecting web content that could mislead AI agents. It surfaces evidence and warnings; it does not certify a page as safe or malicious.

## Build and load

Requires Node.js and npm.

```sh
npm install
npm run build
```

Then open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the generated `dist` directory.

The build creates a popup bundle and a separate `content.js` bundle. When the user clicks **Scan this page**, the popup injects `content.js` into the active tab and requests an in-memory report. The content script uses the local scanner and does not make network requests.

## Privacy and permissions

The extension uses only `activeTab` and `scripting`. It accesses the active tab after the user opens the popup and starts a scan. It does not upload or persist page content.

The scanner and report view share this shape:

- `ScanReport`: `url`, `scannedAt`, and `findings`
- `Finding`: `id`, `category`, `severity`, `title`, `description`, and `evidence`, with optional `selector` and `reason`

## Limits

A scan reports only signals covered by the current checks. A clean report does not prove that a page is safe, and an alert does not prove malicious intent. This extension scans a page for a person; it does not yet intercept content inside an AI agent's browsing runtime.

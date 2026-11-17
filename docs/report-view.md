# Findings report view

The report view is a small DOM renderer for an extension popup or side panel. It has no network or storage behavior.

## Integration

Bundle `src/report-view.ts` with the extension and include `src/report-view.css` in the popup stylesheet. Give the popup a root element, then render either the no-scan state or a report:

```ts
import { renderReport, type ScanReport } from "./report-view.js";
import "./report-view.css";

const root = document.querySelector<HTMLElement>("#report");
if (!root) throw new Error("Missing report root");

let report: ScanReport | null = null;

function showReport(): void {
  renderReport(root, report, {
    onScan: () => {
      // Connect this callback to the extension's current-tab scan flow.
    },
  });
}

showReport();
```

The shared data shape is:

```ts
interface ScanReport {
  url: string;
  scannedAt: string;
  findings: Finding[];
}

interface Finding {
  id: string;
  category: string;
  severity: "info" | "low" | "medium" | "high";
  title: string;
  description: string;
  evidence: string;
  selector?: string;
  reason?: string;
}
```

Call `renderReport(root, report, { isScanning: true, onScan })` while a scan is running, then call it again with the completed report. Pass `null` before the first scan. An empty `findings` array displays a no-findings state with a reminder that the current checks are limited.

The renderer inserts page-derived values with `textContent`; it does not parse them as HTML. Keep the report local to the browser and avoid sending page content to a service.

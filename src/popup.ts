import { renderReport, type ScanReport } from "./report-view";

const app = document.querySelector<HTMLElement>("#app")!;
let report: ScanReport | null = null;
let isScanning = false;
let errorMessage = "";

draw();

async function scanCurrentPage(): Promise<void> {
  if (isScanning) return;
  isScanning = true;
  errorMessage = "";
  draw();

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("No active tab is available.");

    // Opening the popup grants temporary activeTab access. Inject the local
    // scanner only into this tab, then request its in-memory report.
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });

    const response: unknown = await chrome.tabs.sendMessage(tab.id, {
      type: "AWARE_SCAN_PAGE",
    });

    if (!isScanReport(response)) {
      throw new Error("The page scanner returned an invalid report.");
    }
    report = response;
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "The active page could not be scanned.";
  } finally {
    isScanning = false;
    draw();
  }
}

function isScanReport(value: unknown): value is ScanReport {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<ScanReport>;
  return (
    typeof candidate.url === "string" &&
    typeof candidate.scannedAt === "string" &&
    Array.isArray(candidate.findings)
  );
}

function draw(): void {
  renderReport(app, report, {
    onScan: () => void scanCurrentPage(),
    isScanning,
  });

  if (errorMessage) {
    const error = document.createElement("p");
    error.className = "scan-error";
    error.setAttribute("role", "alert");
    error.textContent = `Could not scan this page: ${errorMessage}. Browser-internal pages may not allow scanning.`;
    app.append(error);
  }
}

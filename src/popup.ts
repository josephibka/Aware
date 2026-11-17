type Severity = "info" | "low" | "medium" | "high";

type Finding = {
  id: string;
  category: string;
  severity: Severity;
  title: string;
  description: string;
  evidence: string;
  selector?: string;
  reason?: string;
};

type ScanReport = {
  url: string;
  scannedAt: string;
  findings: Finding[];
};

const scanButton = document.querySelector<HTMLButtonElement>("#scan-button")!;
const status = document.querySelector<HTMLElement>("#status")!;
const results = document.querySelector<HTMLElement>("#results")!;

scanButton.addEventListener("click", () => void scanCurrentPage());

async function scanCurrentPage(): Promise<void> {
  scanButton.disabled = true;
  results.replaceChildren();
  status.textContent = "Scanning the active tab locally…";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("No active tab is available.");

    // The user explicitly opened Aware's popup, so activeTab grants temporary
    // access to this tab. The scanner is injected only for this scan.
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    });

    const report = await chrome.tabs.sendMessage<ScanReport>(tab.id, {
      type: "AWARE_SCAN_PAGE"
    });

    if (!report || !Array.isArray(report.findings)) {
      throw new Error("The scanner did not return a valid report.");
    }

    status.textContent = `Scanned ${new URL(report.url).hostname} at ${new Date(report.scannedAt).toLocaleTimeString()}.`;
    renderFindings(report.findings);
  } catch (error) {
    const message = error instanceof Error ? error.message : "The page could not be scanned.";
    status.textContent = `Could not scan this page: ${message} This can happen on browser-internal pages.`;
  } finally {
    scanButton.disabled = false;
  }
}

function renderFindings(findings: Finding[]): void {
  if (findings.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No warning signals were found by the current checks.";
    results.append(empty);
    return;
  }

  for (const finding of findings) {
    const card = document.createElement("article");
    card.className = "finding";

    const badge = document.createElement("span");
    badge.className = `badge ${finding.severity}`;
    badge.textContent = finding.severity;

    const title = document.createElement("h2");
    title.textContent = finding.title;

    const description = document.createElement("p");
    description.textContent = finding.description;

    const evidence = document.createElement("p");
    evidence.textContent = `Evidence: ${finding.evidence}`;

    card.append(badge, title, description, evidence);
    if (finding.selector) {
      const location = document.createElement("p");
      location.textContent = `Location: ${finding.selector}`;
      card.append(location);
    }
    results.append(card);
  }
}

export type FindingSeverity = "info" | "low" | "medium" | "high";

export interface Finding {
  id: string;
  category: string;
  severity: FindingSeverity;
  title: string;
  description: string;
  evidence: string;
  selector?: string;
  reason?: string;
}

export interface ScanReport {
  url: string;
  scannedAt: string;
  findings: Finding[];
}

export interface ReportViewOptions {
  onScan?: () => void;
  isScanning?: boolean;
}

/**
 * Render Aware's local scan report into a caller-provided element.
 *
 * Page-derived strings are always inserted as text, never interpreted as HTML.
 * The scanner should provide a fresh report from the current page; this view
 * does not make requests or store page content.
 */
export function renderReport(
  root: HTMLElement,
  report: ScanReport | null,
  options: ReportViewOptions = {},
): void {
  root.replaceChildren();
  root.classList.add("aware-report");
  root.setAttribute("aria-live", "polite");
  root.setAttribute("aria-label", "Aware scan report");

  const header = document.createElement("header");
  header.className = "aware-report__header";

  const heading = document.createElement("h1");
  heading.className = "aware-report__title";
  heading.textContent = "Aware";

  const scanButton = document.createElement("button");
  scanButton.className = "aware-report__scan";
  scanButton.type = "button";
  scanButton.textContent = options.isScanning ? "Scanning…" : "Scan this page";
  scanButton.disabled = options.isScanning === true || !options.onScan;
  scanButton.setAttribute("aria-label", "Scan the current page");
  if (options.onScan) {
    scanButton.addEventListener("click", options.onScan);
  }

  header.append(heading, scanButton);
  root.append(header);

  if (options.isScanning) {
    const status = document.createElement("p");
    status.className = "aware-report__status";
    status.setAttribute("role", "status");
    status.textContent = "Scanning the current page locally…";
    root.append(status);
  }

  const notice = document.createElement("p");
  notice.className = "aware-report__notice";
  notice.textContent =
    "Findings are warning signs for review. A scan cannot prove that a page is malicious or safe.";
  root.append(notice);

  if (!report) {
    const empty = document.createElement("section");
    empty.className = "aware-report__empty";
    empty.setAttribute("aria-labelledby", "aware-empty-title");

    const emptyTitle = document.createElement("h2");
    emptyTitle.id = "aware-empty-title";
    emptyTitle.textContent = "No scan yet";

    const emptyText = document.createElement("p");
    emptyText.textContent =
      "Run a scan to inspect this page for content that may be hidden from people or misleading to an AI agent.";

    empty.append(emptyTitle, emptyText);
    root.append(empty);
    return;
  }

  const summary = document.createElement("section");
  summary.className = "aware-report__summary";
  summary.setAttribute("aria-labelledby", "aware-summary-title");

  const summaryTitle = document.createElement("h2");
  summaryTitle.id = "aware-summary-title";
  summaryTitle.textContent = "Scan summary";

  const page = document.createElement("p");
  page.className = "aware-report__page";
  page.textContent = report.url || "Current page";

  const scanned = document.createElement("p");
  scanned.className = "aware-report__timestamp";
  scanned.textContent = formatTimestamp(report.scannedAt);

  summary.append(summaryTitle, page, scanned);
  root.append(summary);

  const findingsHeading = document.createElement("h2");
  findingsHeading.className = "aware-report__findings-heading";
  findingsHeading.textContent = report.findings.length
    ? `Findings (${report.findings.length})`
    : "No findings";
  root.append(findingsHeading);

  if (report.findings.length === 0) {
    const none = document.createElement("p");
    none.className = "aware-report__none";
    none.textContent =
      "The current checks did not detect warning signs on this page.";
    root.append(none);
    return;
  }

  const list = document.createElement("ol");
  list.className = "aware-report__findings";
  for (const finding of report.findings) {
    list.append(renderFinding(finding));
  }
  root.append(list);
}

function renderFinding(finding: Finding): HTMLElement {
  const item = document.createElement("li");
  item.className = "aware-finding";
  item.dataset.severity = finding.severity;

  const topLine = document.createElement("div");
  topLine.className = "aware-finding__top";

  const severity = document.createElement("span");
  severity.className = "aware-finding__severity";
  severity.textContent = finding.severity;
  severity.setAttribute("aria-label", `Severity: ${finding.severity}`);

  const category = document.createElement("span");
  category.className = "aware-finding__category";
  category.textContent = finding.category;

  const title = document.createElement("h3");
  title.className = "aware-finding__title";
  title.textContent = finding.title;

  topLine.append(severity, category);
  item.append(topLine, title);

  const description = document.createElement("p");
  description.className = "aware-finding__description";
  description.textContent = finding.description;
  item.append(description);

  const details = document.createElement("details");
  details.className = "aware-finding__details";

  const summary = document.createElement("summary");
  summary.textContent = "View evidence";
  details.append(summary);

  if (finding.evidence) {
    const evidenceLabel = document.createElement("h4");
    evidenceLabel.textContent = "Observed content";
    const evidence = document.createElement("pre");
    evidence.className = "aware-finding__evidence";
    evidence.textContent = finding.evidence;
    details.append(evidenceLabel, evidence);
  }

  if (finding.selector) {
    const selectorLabel = document.createElement("h4");
    selectorLabel.textContent = "Page location";
    const selector = document.createElement("code");
    selector.className = "aware-finding__selector";
    selector.textContent = finding.selector;
    details.append(selectorLabel, selector);
  }

  if (finding.reason) {
    const reasonLabel = document.createElement("h4");
    reasonLabel.textContent = "Why it was flagged";
    const reason = document.createElement("p");
    reason.className = "aware-finding__reason";
    reason.textContent = finding.reason;
    details.append(reasonLabel, reason);
  }

  item.append(details);
  return item;
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value ? `Scanned at ${value}` : "Scan time unavailable";
  }

  return `Scanned ${new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)}`;
}

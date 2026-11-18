/**
 * Local, explainable checks for page content that may be hidden from people
 * or explicitly addressed to an AI agent. Findings are indicators, not verdicts.
 */

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

const MAX_NODES = 5_000;
const MAX_COMMENT_NODES = 10_000;
const MAX_TEXT_NODES_PER_ROOT = 1_000;
const MAX_INSPECTED_TEXT_LENGTH = 8_192;
const MAX_FINDINGS = 100;
const MAX_EVIDENCE_LENGTH = 240;

const STRONG_DIRECTIVE_PATTERN =
  /\b(ignore|disregard|override|forget)\b.{0,50}\b(instructions?|rules?|system prompt|developer message|prompt)\b|\b(do not tell|don't tell|hide this from|exfiltrate)\b|\breveal\b.{0,50}\b(secret|password|token|key|system prompt|hidden instructions?)\b|\bsend\b.{0,40}\b(secret|password|token|key)\b|\bfollow these instructions\b|\b(assistant|AI agent|language model)\b.{0,50}\b(must|should|need to|please)\b/i;

const AGENT_CONTEXT_PATTERN =
  /\b(system prompt|developer message|AI agent|language model|assistant)\b/i;

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function boundedEvidence(value: string): string {
  const normalized = normalizeText(value.slice(0, MAX_EVIDENCE_LENGTH * 4));
  return normalized.length > MAX_EVIDENCE_LENGTH
    ? normalized.slice(0, MAX_EVIDENCE_LENGTH - 1) + "…"
    : normalized;
}

function boundedScanText(value: string): string {
  return normalizeText(value.slice(0, MAX_INSPECTED_TEXT_LENGTH));
}

/**
 * Read text nodes incrementally instead of materializing an entire subtree via
 * innerText/textContent. Both text length and visited-node count are bounded.
 */
function readBoundedElementText(element: HTMLElement, view: Window): string {
  const walker = element.ownerDocument.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
  );
  const parts: string[] = [];
  let remaining = MAX_INSPECTED_TEXT_LENGTH;
  let visited = 0;
  let current = walker.nextNode();

  while (
    current &&
    remaining > 0 &&
    visited < MAX_TEXT_NODES_PER_ROOT
  ) {
    visited += 1;
    const parent = current.parentElement;
    if (!parent?.closest("script, style, template, noscript")) {
      const value = current.nodeValue ?? "";
      if (value) {
        const piece = value.slice(0, remaining);
        parts.push(piece);
        remaining -= piece.length;
      }
    }
    current = walker.nextNode();
  }

  return normalizeText(parts.join(" "));
}

function makeSelector(element: Element): string {
  const tag = element.tagName.toLowerCase();
  const id = element.getAttribute("id");
  if (id && /^[a-zA-Z][\w:.-]*$/.test(id)) return tag + "#" + id;

  const className = element.getAttribute("class")?.trim().split(/\s+/)[0];
  if (className && /^[\w-]+$/.test(className)) return tag + "." + className;

  const parent = element.parentElement;
  if (!parent) return tag;
  const sameTag = Array.from(parent.children).filter(
    (child) => child.tagName === element.tagName,
  );
  return sameTag.length > 1
    ? tag + ":nth-of-type(" + (sameTag.indexOf(element) + 1) + ")"
    : tag;
}

function hiddenReason(element: HTMLElement, view: Window): string | undefined {
  const style = view.getComputedStyle(element);
  if (style.display === "none") return "CSS display is none";
  if (style.visibility === "hidden" || style.visibility === "collapse")
    return "CSS visibility is hidden";
  if (Number.parseFloat(style.opacity) === 0) return "CSS opacity is zero";

  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return "Element has zero visible area";

  // Content below/above the current viewport may simply need scrolling. Only
  // flag extreme positioning as a likely hiding technique.
  const marginX = Math.max(view.innerWidth * 2, 2_000);
  const marginY = Math.max(view.innerHeight * 2, 2_000);
  if (
    rect.right < -marginX ||
    rect.left > view.innerWidth + marginX ||
    rect.bottom < -marginY ||
    rect.top > view.innerHeight + marginY
  ) {
    return "Element is positioned far outside the viewport";
  }
  return undefined;
}

function makeFinding(input: Finding): Finding {
  return { ...input, evidence: boundedEvidence(input.evidence) };
}

/**
 * Scan a supplied document, or the current page document in a browser content
 * script. This function never makes network requests or changes the page.
 */
export function scanPage(doc?: Document): ScanReport {
  const target = doc ?? (typeof document === "undefined" ? undefined : document);
  const findings: Finding[] = [];
  const scannedAt = new Date().toISOString();

  if (!target) {
    return { url: "", scannedAt, findings };
  }

  let url = "";
  try {
    url = target.location?.href ?? "";
  } catch {
    // Some embedded or synthetic documents may not expose their URL.
  }

  try {
    const view = target.defaultView;
    if (!view) return { url, scannedAt, findings };

    const elements = target.querySelectorAll<HTMLElement>("body *");
    const count = Math.min(elements.length, MAX_NODES);
    const coveredHiddenRoots: HTMLElement[] = [];

    for (
      let index = 0;
      index < count && findings.length < MAX_FINDINGS;
      index += 1
    ) {
      const element = elements[index];
      if (/^(SCRIPT|STYLE|TEMPLATE|NOSCRIPT)$/.test(element.tagName)) continue;

      // A finding on a hidden parent already captures its subtree text. Skip
      // descendants to avoid duplicate findings for the same hidden content.
      if (coveredHiddenRoots.some((root) => root.contains(element))) continue;

      const reason = hiddenReason(element, view);
      if (!reason) continue;

      const scanText = readBoundedElementText(element, view);
      if (!scanText) continue;

      coveredHiddenRoots.push(element);
      const strongDirective = STRONG_DIRECTIVE_PATTERN.test(scanText);
      const genericAgentContext = AGENT_CONTEXT_PATTERN.test(scanText);
      const instructionLike = strongDirective || genericAgentContext;

      findings.push(
        makeFinding({
          id: "hidden-" + index,
          category: instructionLike ? "hidden-instruction" : "hidden-content",
          severity: strongDirective ? "high" : genericAgentContext ? "medium" : "low",
          title: instructionLike
            ? "Agent-related or instruction-like text is hidden"
            : "Text is hidden from the page view",
          description: strongDirective
            ? "Hidden page text contains directive-like wording. Review the source before an agent uses this page."
            : genericAgentContext
              ? "Hidden text mentions an AI agent or instruction context. The mention alone does not establish malicious intent."
              : "The page contains text that is not currently visible in the normal page view.",
          evidence: scanText,
          selector: makeSelector(element),
          reason,
        }),
      );
    }

    // Comments are not rendered as page text. Bound both the number inspected
    // and the amount of each comment examined.
    const walker = target.createTreeWalker(target, NodeFilter.SHOW_COMMENT);
    let current = walker.nextNode();
    let commentIndex = 0;
    let commentsInspected = 0;
    while (
      current &&
      commentsInspected < MAX_COMMENT_NODES &&
      findings.length < MAX_FINDINGS
    ) {
      commentsInspected += 1;
      const commentText = boundedScanText(current.nodeValue ?? "");
      const strongDirective = STRONG_DIRECTIVE_PATTERN.test(commentText);
      const genericAgentContext = AGENT_CONTEXT_PATTERN.test(commentText);
      if (strongDirective || genericAgentContext) {
        const parent = current.parentElement;
        findings.push(
          makeFinding({
            id: "comment-" + commentIndex,
            category: "comment-instruction",
            severity: strongDirective ? "medium" : "low",
            title: strongDirective
              ? "Directive-like text appears in an HTML comment"
              : "AI-related text appears in an HTML comment",
            description: "HTML comments are not normally visible to people but may be included in page source given to an agent.",
            evidence: commentText,
            selector: parent ? makeSelector(parent) : undefined,
            reason: "HTML comment is not rendered as page text",
          }),
        );
      }
      commentIndex += 1;
      current = walker.nextNode();
    }

    // Page metadata is machine-readable and usually not part of the visible
    // page body. Inspect only a bounded number and amount of text.
    const metadata = target.querySelectorAll<HTMLMetaElement>(
      'meta[name="description"], meta[property="og:description"], meta[name="keywords"]',
    );
    const metadataCount = Math.min(metadata.length, MAX_NODES);
    for (
      let index = 0;
      index < metadataCount && findings.length < MAX_FINDINGS;
      index += 1
    ) {
      const element = metadata[index];
      const value = boundedScanText(element.content || "");
      const strongDirective = STRONG_DIRECTIVE_PATTERN.test(value);
      const genericAgentContext = AGENT_CONTEXT_PATTERN.test(value);
      if (!strongDirective && !genericAgentContext) continue;
      findings.push(
        makeFinding({
          id: "metadata-" + index,
          category: "metadata-instruction",
          severity: strongDirective ? "medium" : "low",
          title: strongDirective
            ? "Directive-like text appears in page metadata"
            : "AI-related text appears in page metadata",
          description: "This metadata may be read by an agent even though it is not shown in the main page content.",
          evidence: value,
          selector: makeSelector(element),
          reason: "Metadata is not normally displayed in the page",
        }),
      );
    }
  } catch {
    // Keep the scan safe on pages whose DOM changes during inspection.
    return { url, scannedAt, findings };
  }

  return { url, scannedAt, findings };
}

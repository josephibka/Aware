# Aware

Aware is a local-first browser extension project for finding web content that may mislead AI agents. It surfaces evidence for a person to review; it does not decide whether a page is malicious or safe.

[Problem](#the-problem) · [Approach](#approach) · [How it works](#how-it-works) · [Results](#results) · [Development](#development) · [Related work](#related-work)

> **Project status:** Aware is in early development. The extension prototype is being built on feature branches; this README will be updated as implementation and testing progress.

## The problem

AI agents use web pages as information sources. A page can contain instructions or claims that an agent reads even when a person does not see them in the normal page view. Examples include text hidden with CSS, HTML comments, and page metadata. Other attacks use visible wording to steer an agent, so differences between human-visible and machine-readable content are only one part of the problem.

This is an indirect prompt-injection risk: the page is untrusted input, but an agent may treat its content as instructions while pursuing a user’s task. If the agent also has access to tools or sensitive data, misleading content can have consequences beyond an inaccurate answer.

## Approach

Aware starts with a local, explainable scan of the page open in the browser. It uses bounded checks to look for:

- Text that is hidden, has no visible area, or is positioned far outside the viewport.
- Instruction-like language in hidden content.
- Instruction-like content in HTML comments or selected metadata fields.

For each finding, Aware shows the observed text, its page location when available, and the reason it was flagged. The scan runs in the browser and does not upload or store page content. The first version uses deterministic checks; machine learning and agent-runtime integrations are possible later steps, after the basic scanner can be evaluated.

## How it works

1. Open the extension popup on the page to inspect and choose **Scan this page**.
2. The popup injects Aware’s content script into the active tab using Chrome’s temporary `activeTab` access.
3. The scanner inspects the current DOM and computed styles locally. It caps the amount of content it examines to keep scans bounded.
4. The popup displays findings with severity, evidence, and location details.

The extension currently scans on a person’s request. It does **not** intercept an AI agent’s browser or guarantee that the agent sees Aware’s warnings. Connecting Aware to an agent’s browsing or retrieval path is future work.

## Results

**Build and typecheck passed locally** on `feat/extension-shell` after fixing a TypeScript issue in the scanner. Manual browser checks have not yet been run, so there are no accuracy, detection-rate, or false-positive results to report.

The next evaluation should:

- Build and load the extension in Chrome.
- Scan the harmless hidden-instruction demo and check that Aware shows the expected evidence.
- Scan ordinary metadata and accessibility-text examples and check that they are not described as malicious.
- Record missed findings and false alarms, then adjust the rules based on those observations.

Static demo pages are being developed on the [safe-fixtures branch](https://github.com/josephibka/Aware/tree/feat/safe-fixtures/fixtures).

## Limits

- A warning is a signal for review, not proof of malicious intent; no findings do not prove a page is safe.
- The current checks focus on detectable page structure and wording. They may miss visible persuasion, content rendered only after later interactions, image-based instructions, or other semantic attacks.
- To bound work, the scanner examines at most 8,192 characters from each hidden-content root, HTML comment, or selected metadata value. Content beyond that limit may not be analyzed.
- The extension does not block a page or constrain an AI agent’s tools.
- The current prototype has no database and uses no machine-learning classifier.

## Development

The runnable extension prototype is currently on the `feat/extension-shell` branch. After checking out that branch, it requires Node.js and npm:

```sh
npm install
npm run build
npm run typecheck
```

To load the built extension, open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the generated `dist` directory.

The build and typecheck passed locally. Loading the extension in Chrome and scanning the fixture pages remain to be done.

## Related work

| Work | Relevance to Aware |
|---|---|
| [AI Agent Traps (Google DeepMind researchers)](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6372438) | Describes web-content attacks against agents, including content injection, semantic manipulation, and behavioral control. It provides broader context for Aware’s initial focus on page-level signals. |
| [OWASP Top 10 for LLM Applications: Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) | Explains how untrusted external content can influence model behavior and why prompt-injection defenses are not foolproof. |
| [OWASP Prompt Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html) | Offers layered defensive guidance such as treating external content as untrusted, limiting permissions, and validating actions separately. |
| [BrowseSafe++](https://github.com/perplexityai/browsesafe-plus-plus) | A research evaluation harness for webpage prompt-injection detection across different page representations. Its paired examples offer ideas for measuring false positives as well as detections. |

Aware is a small defensive prototype. Its scan results should be evaluated against benign and adversarial examples, and used as one signal within a broader agent-safety design.

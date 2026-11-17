# Safe scanner fixtures

These pages are local, static examples for manually exploring Aware's findings. They contain no executable attack code, external scripts, tracking, network requests, or data collection. They are not tests and do not claim to represent every real-world attack.

Open an HTML file directly in a browser, then use Aware's scan action when the extension is available.

## Pages

- `accessible-content.html`: ordinary visible page copy with a small screen-reader-only helper. A scanner may report that hidden text exists; this is expected and is not evidence of malicious intent.
- `hidden-instruction-demo.html`: an intentionally obvious, harmless instruction-like sentence in hidden page text. It exists to demonstrate a warning and contains no commands that perform actions.
- `ordinary-metadata.html`: routine metadata and an ordinary HTML comment. It should not trigger instruction-specific findings.

Scanner results can vary as the implementation changes. Treat findings as review cues, not verdicts that a page is malicious or safe.

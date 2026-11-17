import { scanPage } from "./scanner";

type AwareWindow = Window & {
  __awareScanListenerInstalled?: boolean;
};

const pageWindow = window as AwareWindow;

if (!pageWindow.__awareScanListenerInstalled) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (
      typeof message !== "object" ||
      message === null ||
      !("type" in message) ||
      message.type !== "AWARE_SCAN_PAGE"
    ) {
      return false;
    }

    sendResponse(scanPage(document));
    return false;
  });

  pageWindow.__awareScanListenerInstalled = true;
}

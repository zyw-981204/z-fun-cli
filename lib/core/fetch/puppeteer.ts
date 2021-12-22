import puppeteer from "puppeteer";
type TBrowserOption = puppeteer.LaunchOptions &
  puppeteer.BrowserLaunchArgumentOptions &
  puppeteer.BrowserConnectOptions & {
    product?: puppeteer.Product;
    extraPrefsFirefox?: Record<string, unknown>;
  };

let browser: puppeteer.Browser;

export async function getBrowser(options?: TBrowserOption) {
  if (browser) {
    return browser;
  }
  browser = await puppeteer.launch({
    ...options,
    ignoreDefaultArgs: ["--enable-automation"],
  });

  return browser;
}

/**
 *
 * @returns return the page
 */
export const getNewPage: () => Promise<puppeteer.Page> = async () => {
  const _page = await browser.newPage();
  await _page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", {
      get: () => undefined,
    });
  });
  await _page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36"
  );
  return _page;
};

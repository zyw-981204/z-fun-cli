import puppeteer from "puppeteer";
import {
  outputFileSync,
  remove,
  existsSync,
  outputJsonSync,
  outputJSON,
} from "fs-extra";
const { sleep } = require("./tool");
const startTime = new Date();
import { join, isAbsolute } from "path";
const urljoin = require("url-join");

import {
  log,
  error,
  stopSpinner,
  resumeSpinner,
  failSpinner,
  done,
  info,
  logWithSpinner,
  root,
} from "../../cli-shared-utils";
import { selectMap, replaceThings, timeout } from "../fetch/constant";

const cwd = process.cwd();
import { pRetryConsumer, pRetryProvider, createLimit } from "./p-tools";
import { setSlient } from "../../cli-shared-utils/lib/silence";
import resolvePkg from "../../utils/resolvePkg";

function getCache() {
  const cache = resolvePkg(root, "cache.json");
  return cache;
}
let i = 0;

const map = new Map<string, string>();

// 使用 puppeteer 访问网址，获取对应内容
/**
 *
 * @param page page实例
 * @param aas 链接数组
 * @param i 第i个链接
 * @param savetxt 保存text的函数
 */
async function fetch(page: puppeteer.Page, aas: string[], i: number) {
  await page.goto(aas[i], {
    timeout,
  });
  const err = await page.waitForSelector("#content", {
    timeout,
  });
  let txt = await page.$eval<string>(
    "#content",
    (c) => c.textContent as string
  );
  const title = await page.$eval("h1", (c) => c.textContent);
  replaceThings.forEach((value) => {
    txt = txt.replace(value, "");
  });

  map.set(aas[i], `${title}\n ${txt}\n`);
  await sleep(10);
}

async function savetxt(outputFilePath: string, txt: string) {
  outputFileSync(outputFilePath, txt, {
    flag: "a",
  });
  logWithSpinner(`${i++} 写入完成 `);
}

function getMinutes(ms: number) {
  return (ms / 1000 / 60).toFixed(2);
}
/**
 *
 * @param target 访问的地址
 * @param downloadPath 下载的文件夹的位置
 */

export type TFetchNovelOption = {
  fetchTarget: string;
  outputFileDir: string;
  novelName: string;
  headless: boolean;
  quantity: number;
  isDebugger: boolean;
  force: boolean;
  limitNumber: number;
};

export default async function fetchNovel(option: TFetchNovelOption) {
  const {
    novelName: diyNovelName,
    fetchTarget: target = "https://www.xbiquge.la/48/48900/",
    outputFileDir: downloadPath = join(cwd, "fetch"),
    headless = false,
    quantity,
    isDebugger = false,
    force = false,
    limitNumber = 3,
  } = option;
  if (isDebugger) {
    setSlient(false);
  }
  const limit = createLimit(Number(limitNumber));
  try {
    (async () => {
      try {
        // 开始先清空文件夹
        const browser = await puppeteer.launch({
          headless: headless,
        });
        // 打开新的标签页
        const page = await browser.newPage();
        await page.setUserAgent(
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36"
        );
        // await page.evaluate(async () => {
        //   Object.defineProperty(navigator, 'webdriver', { get: ()=> false });
        // });
        await page.goto(target, {
          waitUntil: "load",
        });
        const isXbiquge = target.includes("xbiquge.la");

        const urlStr = await page.url();
        const arr: Array<string> = urlStr.match(
          /((http|https):\/\/)([^\/]+)(\/\S*)/
        ) as string[];

        // 新笔趣阁和笔趣阁网页前缀不一致

        const prefix = isXbiquge ? `${arr[1]}${arr[3]}` : urlStr;
        const aSelector = selectMap[isXbiquge ? "xbiquge" : "biquge"].aSelector;

        let aas = await page.$$eval<string[]>(
          aSelector,
          (aas) => aas.map((a) => a.getAttribute("href")) as string[]
        );

        aas = aas.map((a) => urljoin(prefix, a));

        if (quantity && quantity > 0) {
          aas = aas.slice(0, quantity);
        }
        const cache = getCache();
        // 过滤掉在 cache 中有的 a 链接
        const needFetchLinks = aas.filter((a) => !(a in cache));
        // gotNovelName 获取小说名称
        const titleSelectoror =
          selectMap[isXbiquge ? "xbiquge" : "biquge"].titleSelector;

        log();
        log("titleSelectoror" + titleSelectoror);
        let novelName;
        try {
          novelName = diyNovelName
            ? diyNovelName
            : await page.$eval("h1", (h1) => h1.textContent, {
                timeout,
              });

          info("小说名称为" + novelName);
        } catch (e) {
          error("获取小说名字超时");
        }

        const outputFileDir = isAbsolute(downloadPath)
          ? downloadPath
          : join(cwd, downloadPath);
        const outputFilePath = `${outputFileDir}/${novelName}.txt`;
        info(`文件保存路径   \n outputFilePath`);

        if (existsSync(outputFilePath)) {
          await remove(outputFilePath);
          info("文件清除完成" + outputFilePath);
        }
        await page.close();

        try {
          const pool = [];
          for (let i = 0; i < needFetchLinks.length; i++) {
            pool.push(
              limit(async () => {
                resumeSpinner();
                const _page = await browser.newPage();
                await _page.setUserAgent(
                  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36"
                );
                const innerFn = async () =>
                  await fetch(_page, needFetchLinks, i);
                const run = pRetryProvider(innerFn);
                await pRetryConsumer(run);
                await _page.close();
                logWithSpinner(`${i} 访问完成`);
              })
            );
          }
          info(` 已获取所有需要访问的链接,总数量为 ${pool.length} `);
          log("fetch 完成");
          await Promise.all(pool);
          log("开始写入文件");
          aas.forEach((a) => {
            if (a in cache) {
              savetxt(outputFilePath, cache[a]);
            } else {
              const text = map.get(a);
              cache[a] = text;
              savetxt(outputFilePath, cache[a]);
            }
          });

          outputJsonSync(`${root}/cache.json`, cache, "utf8");
        } catch (err) {
          console.log("error", err);
        }
        const endDate = new Date();
        info(
          "总共耗时" +
            getMinutes(endDate.valueOf() - startTime.valueOf()) +
            "minutes"
        );
        await browser.close();
        done("下载完成");
        stopSpinner();
        process.exit(1);
      } catch (e) {
        failSpinner(e as string);
        error(e);
        process.exit(1);
      }
    })();
  } catch (e) {
    error(e);
    failSpinner(e as string);
    process.exit(1);
  }
}

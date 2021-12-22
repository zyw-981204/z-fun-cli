import * as puppeteer from "puppeteer";
import { outputFileSync, remove, existsSync, outputJsonSync, outputJSON } from "fs-extra";
const { sleep } = require("./tool");
const startTime = new Date();
import { join, isAbsolute } from "path";
const urljoin = require("url-join");
import { pRetryConsumer, pRetryProvider, createLimit } from "./p-tools";
import { getBrowser, getNewPage } from "./puppeteer";

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
  chalk,
  warn,
  setSlient,
  resolvePkg,
} from "@cli-shared-utils";
import { selectMap, replaceThings, timeout } from "../fetch/constant";

const cwd = process.cwd();
let i = 0;
const cache = resolvePkg(root, "cache.json");

// 使用 puppeteer 访问网址，获取对应内容
/**
 *
 * @param page page实例
 * @param allLinks 链接数组
 * @param i 第i个链接
 * @param savetxt 保存text的函数
 */
async function fetch(page: puppeteer.Page, allLinks: string[], i: number) {
  await page.goto(allLinks[i], {
    timeout,
  });
  const err = await page.waitForSelector("#content", {
    timeout,
  });
  let txt = await page.$eval<string>("#content", (c) => c.textContent as string);
  const title = await page.$eval("h1", (c) => c.textContent);
  replaceThings.forEach((value) => {
    txt = txt.replace(value, "");
  });
  cache[allLinks[i]] = `${title}\n ${txt}\n`;
  await sleep(10);
}

async function savetxt(outputFilePath: string, txt: string, i: number) {
  outputFileSync(outputFilePath, txt, {
    flag: "a",
  });
  logWithSpinner(`${i++} 写入完成`);
}

function getMinutes(ms: number) {
  return (ms / 1000 / 60).toFixed(2);
}

function judgeNeedFetch(link: string) {
  return !(link in cache) || !cache[link];
}

// 处理网址 type 获取 prefix
// 1. 判断网址类型，根据网址获取 各种 selector novelName
async function getInitInfo(params: {
  wantedFetchUrl: string;
  page: puppeteer.Page;
  downloadPath: string;
  diyNovelName: string;
}): Promise<{
  prefix: string;
  aSelector: string;
  titleSelectoror: string;
  isXbiquge: boolean;
  outputFilePath: string;
  novelName: string;
}> {
  const { wantedFetchUrl: target, page, downloadPath, diyNovelName } = params;
  const isXbiquge = target.includes("xbiquge.la");
  const urlStr = await page.url();
  const arr: Array<string> = urlStr.match(/((http|https):\/\/)([^\/]+)(\/\S*)/) as string[];

  // 新笔趣阁和笔趣阁网页前缀不一致
  const prefix = isXbiquge ? `${arr[1]}${arr[3]}` : urlStr;
  const aSelector = selectMap[isXbiquge ? "xbiquge" : "biquge"].aSelector;
  const titleSelectoror = selectMap[isXbiquge ? "xbiquge" : "biquge"].titleSelector;

  // 获取小说名称
  const novelName = await getNovelName({
    page,
    diyNovelName,
    titleSelectoror,
  });
  log(`下载小说为${novelName}`);

  const outputFileDir = isAbsolute(downloadPath) ? downloadPath : join(cwd, downloadPath);
  const outputFilePath = `${outputFileDir}/${novelName}.txt`;

  return {
    prefix,
    aSelector,
    isXbiquge,
    titleSelectoror,
    outputFilePath,
    novelName,
  };
}
// 获取小说名称
async function getNovelName(params: {
  titleSelectoror: string;
  diyNovelName: string;
  page: puppeteer.Page;
}): Promise<string> {
  const { titleSelectoror = "h1", diyNovelName, page } = params;
  let novelName;
  try {
    novelName = diyNovelName
      ? diyNovelName
      : await page.$eval(titleSelectoror, (h1) => h1.textContent, {
          timeout,
        });

    info("小说名称为" + novelName);
    return novelName ?? "";
  } catch (e) {
    error("获取小说名字超时");
    return diyNovelName;
  }
}

// 获取所有 links, 和需要遍历的 links
async function getLinks(options: {
  aSelector: string;
  prefix: string;
  wantedDownloadQuantity?: number;
  page: puppeteer.Page;
}) {
  const { aSelector, prefix, wantedDownloadQuantity, page } = options;
  // 从页面上获取所有a链接
  let allLinks: string[] = await page.$$eval(
    aSelector,
    (links) => links.map((a) => a.getAttribute("href")) as string[]
  );

  // 处理成绝对地址
  allLinks = allLinks.map((link) => urljoin(prefix, link));

  // 看是否指定下载几章节
  if (wantedDownloadQuantity && wantedDownloadQuantity > 0) {
    allLinks = allLinks.slice(0, wantedDownloadQuantity);
  }

  // 过滤掉在 cache 中有的 a 链接
  const needFetchLinks = allLinks.filter((link) => judgeNeedFetch(link));
  return {
    allLinks,
    needFetchLinks,
  };
}

async function fetchNovels(params: { limitNumber: number; needFetchLinks: string[] }) {
  const { limitNumber, needFetchLinks } = params;
  if (needFetchLinks.length === 0) {
    return;
  }
  info(`将开启 ${chalk.blue(limitNumber)} 个下载通道`);

  const limit = createLimit(Number(limitNumber));
  try {
    const threadPool = [];
    for (let i = 0; i < needFetchLinks.length; i++) {
      threadPool.push(
        limit(async () => {
          resumeSpinner();
          const _page = await getNewPage();
          const innerFn = async () => await fetch(_page, needFetchLinks, i);
          const run = pRetryProvider(innerFn);
          await pRetryConsumer(run);
          await _page.close();
          logWithSpinner(`${i} 访问完成`);
        })
      );
    }
    info(` 已获取所有需要访问的链接,总数量为 ${threadPool.length} `);
    log("fetch 完成");
    await Promise.all(threadPool);
  } catch (e) {
    error(`fetch novel 产生错误， error: ${e}`);
  }
}
async function emptyDir(dir: string) {
  // 之前有文件 需要清除
  try {
    if (existsSync(dir)) {
      warn(`${dir} \t 存在文件，${chalk.yellow("z-fun-cli 将覆盖此文件")}`);
      await remove(dir);
      info("文件清除完成\t " + dir);
    }
  } catch (e) {
    error(`
        ${dir}\t  文件清除失败 \n
        错误为: ${chalk.red(e)}
      `);
  }
}

// 将文件写入文件系统
async function emitAssets(params: { allLinks: string[]; outputFilePath: string }) {
  const { allLinks, outputFilePath } = params;
  // 写入文件
  try {
    log("开始写入文件");
    allLinks.forEach((a, index) => {
      savetxt(outputFilePath, cache[a], index);
    });
    outputJsonSync(`${root}/cache.json`, cache, "utf8");
  } catch (e) {
    error(`写入文件出错，错误为 ${e}`);
  }
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
    outputFileDir: downloadPath = join(cwd, "downloads"),
    headless = false,
    quantity,
    isDebugger = false,
    force = false,
    limitNumber = 3,
  } = option;
  if (isDebugger) {
    setSlient(false);
  }

  try {
    (async () => {
      try {
        // 打开浏览器
        const browser = await getBrowser({
          headless,
        });
        // 打开新的标签页
        const page = await getNewPage();
        await page.goto(target, {
          waitUntil: "load",
        });
        // 从开始 fetch 的 url 中获取初始化信息
        const { prefix, aSelector, titleSelectoror, outputFilePath, novelName } = await getInitInfo({
          page,
          wantedFetchUrl: target,
          downloadPath,
          diyNovelName,
        });

        // 获取链接
        const { allLinks, needFetchLinks } = await getLinks({
          aSelector,
          prefix,
          wantedDownloadQuantity: quantity,
          page,
        });

        await page.close();

        log(`《${novelName}》 共 ${allLinks.length} 章`, "总计");

        await fetchNovels({
          limitNumber,
          needFetchLinks,
        });

        await emptyDir(outputFilePath);

        await emitAssets({
          allLinks,
          outputFilePath,
        });

        const endDate = new Date();
        stopSpinner(false);
        info("总共耗时" + getMinutes(endDate.valueOf() - startTime.valueOf()) + "minutes");
        await browser.close();
        done(`小说${novelName}下载完成`);
        info(`文件存放路径为 ${outputFilePath}`);
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

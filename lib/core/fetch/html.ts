import { Page } from "puppeteer";
import {
  isHtml,
  getFileNameByUrl,
  getFilePathByUrl,
  downloadNoFileHtml,
  downloadFile,
  getAllSourceUrls,
  sleep,
} from "./tool";

const puppeteer = require("puppeteer");
const path = require("path");

// 初始化的网址
const urls: string[] = ["https://www.pudeepharm.com//", "https://www.pudeepharm.com/aboutus/"];

export default function main() {
  const copyUrls = new Set<string>([...urls]);
  const q: string[] = [...urls];
  const set = new Set([...urls]);
  try {
    (async () => {
      const browser = await puppeteer.launch({ headless: false });
      const page = await browser.newPage();
      while (q.length) {
        const url = q.shift() as string;
        if (isHtml(getFileNameByUrl(url, { origin: true })) && !copyUrls.has(url)) {
          console.log("跳过了非一级目录的下载", url);
          continue;
        }
        if (url.endsWith(".html")) {
          console.log("跳过了.html的下载", url);
          continue;
        }
        if (!isHtml(url)) {
          console.log("资源直接下载", url);
          downloadByUrl(url, page);
          continue;
        }
        const tpurls = await getAllSourceUrls(page, url);
        getUniqueUrls(tpurls, set, q);
        // 一级目录的下载
        if (isHtml(url) && copyUrls.has(url)) {
          downloadByUrl(url, page);
        }
        await sleep();
        console.log("剩余要下载的", q.length);
        console.log("总共有多少链接", set.size);
      }
      console.log("总共有多少链接", set.size);
      browser.close();
    })();
  } catch (error) {
    console.log("our error", error);
  }
}

// 1. 根据url获取filename & filePath
// 2. 没有后缀，通过获取innerHtml来获取
// 2. 有后缀，直接下载对应文件到对应路径
async function downloadByUrl(url: string, page: Page) {
  console.log("爬取开始");
  const fileName = getFileNameByUrl(url);
  const filePath = getFilePathByUrl(url);
  console.log("fileName", fileName);

  if (isHtml(url)) {
    await downloadNoFileHtml(page, url);
    return;
  }
  await downloadFile(url, fileName, filePath);
}

function getUniqueUrls(urls: string[], set: Set<string>, q: string[]) {
  while (urls.length) {
    const url = urls.shift() as string;
    if (!set.has(url)) {
      q.push(url);
      set.add(url);
    }
  }
}

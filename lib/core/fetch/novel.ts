import puppeteer from "puppeteer";
import { outputFileSync, remove } from "fs-extra";
const { sleep } = require("./tool");
const startTime = new Date();
import { join } from "path";
import { log, error, stopSpinner, resumeSpinner, failSpinner } from "../../cli-shared-utils";

import pRetry from "p-retry";

import pLimit from "p-limit";
const limit = pLimit(4);
let i = 0;

// 使用 puppeteer 访问网址，获取对应内容
/**
 *
 * @param page page实例
 * @param aas 链接数组
 * @param i 第i个链接
 * @param savetxt 保存text的函数
 */
async function fetch(page: puppeteer.Page, aas: string[], i: number, savetxt: (value: string) => void) {
  await page.goto(aas[i]);
  const err = await page.waitForSelector("#content", {
    timeout: 5000,
  });
  let txt = await page.$eval("#content", (c) => c.textContent);
  txt = txt.replace(/readx\(\);\s*/g, "");
  txt = txt.replace(
    "亲,点击进去,给个好评呗,分数越高更新越快,据说给新笔趣阁打满分的最后都找到了漂亮的老婆哦!手机站全新改版升级地址：https://m.xbiquge.la，数据和书签与电脑站同步，无广告清新阅读！",
    ""
  );
  await savetxt(`${txt}\n`);
  await sleep(10);
}

function getMinutes(ms: number) {
  return (ms / 1000 / 60).toFixed(2);
}
/**
 *
 * @param target 访问的地址
 * @param downloadPath 下载的文件夹的位置
 */
export default async function fetchNovel(
  target: string = "https://www.xbiquge.la/1/1710/",
  downloadPath: string = join(process.cwd(), "download")
) {
  try {
    (async () => {
      try {
        await remove(`${downloadPath}/novels/斗罗大陆.txt`);
        const browser = await puppeteer.launch({
          headless: false,
        });
        const page = await browser.newPage();
        await page.goto(target);
        await page.waitForSelector("#list");
        const urlStr = await page.url();
        const arr = urlStr.match(/((http|https):\/\/)([^\/]+)(\/\S*)/);
        const prefix = `${arr[1]}${arr[3]}`;

        const aas = await page.$$eval(
          "#list > dl > dd  a",
          (aas, prefix) => aas.map((a) => prefix + a.getAttribute("href")),
          prefix
        );
        try {
          for (let i = 0; i < aas.length; i++) {
            resumeSpinner();
            const run = async () => {
              try {
                return await fetch(page, aas, i, savetxt);
              } catch (err) {
                error("网络错误");
                stopSpinner();
                await sleep(1000 * 2);
                throw new Error("下载链接超时");
              }
            };
            await pRetry(run, {
              retries: 10,
              onFailedAttempt: (error) => {
                console.log(`Attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left.`);
              },
            });
          }
        } catch (err) {
          console.log("error", err);
        }
        const endDate = new Date();
        console.log("总共耗时", getMinutes(endDate - startTime));
        await browser.close();
        async function savetxt(txt: string) {
          outputFileSync(`${downloadPath}/novels/斗罗大陆.txt`, txt, {
            flag: "a",
          });
          log(`写入完成 ${i++}`);
        }
      } catch (err) {
        console.log("our error", err);
        failSpinner("网络错误");
        error("网络错误");
        process.exit(1);
      }
    })();
  } catch (err) {
    console.log("our error", err);
    failSpinner("网络错误");
    error("网络错误");
    process.exit(1);
  }
}

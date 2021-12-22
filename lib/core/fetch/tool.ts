import { existsSync } from "fs";
import { join } from "path";
import { Page } from "puppeteer";

const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");
const download = require("download");
const makeDir = require("make-dir");
const { prefix, downloadPath, delay } = {
  prefix: "https://www.fiberboardchina.com",
  downloadPath: path.resolve(__dirname, "./src/download/latestHtml/"),
  delay: 1000,
};

export async function saveFile(dirname: string, fileName: string, content: string | Buffer, needClear?: boolean) {
  const filePath = path.resolve(dirname, fileName);
  if (needClear) {
    fs.writeFileSync(filePath, "", {
      flag: "w",
      encoding: "utf-8",
    });
  }
  fs.writeFileSync(filePath, content, {
    flag: "a",
    encoding: "utf-8",
  });
  console.log("filePath", filePath, fileName, "写入完成");
}

export const clear = (pathString: string) => {
  const isAbs = path.isAbsolute(pathString);
  if (isAbs) {
    fs.writeFileSync(pathString, "", {
      encoding: "utf-8",
      flag: "w",
    });
  } else {
    fs.writeFileSync(path.join(__dirname, pathString), "", {
      encoding: "utf-8",
      flag: "w",
    });
  }
};

const imgReg = /.(jpg|png|gif|jepg)$/i;
const htmlReg = /.html$/i;
export const isHtml = (fileName: string) => !fileName.includes(".");
export const isJs = (fileName: string) => fileName.includes(".") && fileName.endsWith("js");
export const isImg = (fileName: string) => imgReg.test(fileName);

export const downloadImg = async (url: string, fileName: string) => {
  if (Array.isArray(url)) {
    const files = await Promise.all(
      ["unicorn.com/foo.jpg", "cats.com/dancing.gif"].map((url) => download(url, "dist"))
    );
    files.forEach((file) => fs.writeFileSync(`../download/latestHtml/${fileName}`, file));
    return;
  }
  console.log("下载图片");
  // fs.writeFileSync('dist/foo.jpg', await download(url, `../download/latestHtml/${fileName}`));
  fs.writeFileSync(`src/download/latestHtml/${fileName}`, await download(url));
  // download('unicorn.com/foo.jpg').pipe(fs.createWriteStream('dist/foo.jpg'));
};

/**
 *
 * @param url 用于根据url 获取fileName
 * @param options  {
    origin?: boolean;  是否是url中的文件名
    prefix?: string;   url 之前的公共前缀
  }
 * @returns
 *   / => index.html
 *   /index => index.html
 *   /js/1.js => 1.js
 */

export function getFileNameByUrl(
  url: string,
  options?: {
    origin?: boolean;
    prefix?: string;
  }
) {
  const isResolveUrl = /^https?/i.test(url);
  const temUrl = isResolveUrl ? url : (prefix ?? "") + url;
  let fileName = temUrl.slice(temUrl.lastIndexOf("/") + 1);
  if (options && options.origin) {
    return fileName;
  }
  if (!fileName.length) {
    fileName = "index";
  }
  return isHtml(fileName) ? `${fileName}.html` : fileName;
}

/**
 *
 * @param url 通过url 获取文件保存的相对路径
 * @returns 获取文件保存的相对路径
 */
export function getFilePathByUrl(url: string) {
  // 判断是否是绝对网址
  const isResolveUrl = /^https?/i.test(url);

  // 去掉域名的path
  const pathIncludeFilename = !isResolveUrl ? url : url.replace(prefix, "");

  // path 中的文件名
  const originFileName = getFileNameByUrl(url, { origin: true });

  // 路径名
  return pathIncludeFilename.replace(originFileName, "");
}

/**
 *
 * @param page puptter 实例
 * @param url 需要获取的url
 */
export async function downloadNoFileHtml(page: any, url: string) {
  try {
    await page.goto(url, { waitUntil: "load" });
    const content = await page.content("html", (html: Element) => html.innerHTML);
    const savePath = getFilePathByUrl(url);
    if (!existsSync(savePath)) {
      await makeDir(savePath);
    }
    await saveFile(savePath, getFileNameByUrl(url), content, true);
  } catch (error) {
    console.log("下载noHTML文件错误", error);
  }
}

/**
 *
 * @param url 需要下载为文件
 * @param fileName 文件名
 * @param filePath 文件路径
 */
export async function downloadFile(url: string, fileName: string, filePath: string) {
  const savePath = join(downloadPath, filePath);
  const saveFileName = join(downloadPath, filePath, fileName);
  // 不存在路径创建路径
  if (!existsSync(savePath)) {
    await makeDir(savePath);
  }
  // 写入文件
  fs.writeFileSync(saveFileName, await download(url));
}

// 将所有url转换成绝对路径的url
function formatUrl(url: string) {
  url = url.replace(/\/$/, "");
  if (!/^(https:\/\/)|^\//i.test(url)) {
    url = `/${url}`;
  }
  if (!/^(https:\/\/)/i.test(url)) {
    url = prefix + url;
  }
  return url;
}

// 过滤 无效的url & 统一格式 & 去重
export function uniqueUrl(urls: string[]) {
  /*
  urls 中可能存在
    1. #;
    2. javascript:void(0);
    3. 邮箱;
    4. 绝对网址
    5. 相对网站

    需要对前三种进行过滤
    对绝对网址进行操作
    相对网址进行加工后保存

    如何做
      1. 去除 1，2，3
      2. 将最后的 / 删除
      3. 将相对路径转换为绝对路径
      4. 去重
    */
  return Array.from(
    new Set([
      ...urls.filter((v) => !/(void\(0\))|(^#+$)|(@)|(^http:\/\/)|javascript;/i.test(v)).map((v) => formatUrl(v)),
    ])
  );
}
export async function getAllSourceUrls(page: Page, url: string) {
  const urls: string[] = [];
  await page.goto(url, { waitUntil: "domcontentloaded" });
  urls.push(
    ...(await page.$$eval<string[]>("[href]", (hrefs) => hrefs.map((v) => v.getAttribute("href")) as string[]))
  );
  urls.push(
    ...(await page.$$eval<string[]>("[link]", (links) => links.map((v) => v.getAttribute("link")) as string[]))
  );
  urls.push(
    ...(await page.$$eval<string[]>("[src]", (links) => {
      return links.map((v) => v.getAttribute("src")) as string[];
    }))
  );
  return uniqueUrl(urls);
}

export async function sleep(delay: number = 1000) {
  return new Promise((resolve) => setTimeout(resolve, delay));
}

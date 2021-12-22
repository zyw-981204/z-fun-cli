export const timeout = 5000;
export const targetUrl = "https://www.xbiquge.la/48/48900/";
export const replaceThings: (RegExp | string)[] = [
  "亲,点击进去,给个好评呗,分数越高更新越快,据说给新笔趣阁打满分的最后都找到了漂亮的老婆哦!手机站全新改版升级地址：https://wap.xbiquge.la，数据和书签与电脑站同步，无广告清新阅读！",
  /readx\(\);\s*/g,
  "笔趣阁 www.bbiquge.net，最快更新宇宙职业选手最新章节！",
];

// 网页 url => selector
export const selectMap = {
  biquge: {
    aSelector: "dl.zjlist dd a",
    titleSelector: "#main h1",
    alistSelect: ".zjlist",
  },
  xbiquge: {
    aSelector: "#list > dl > dd  a",
    titleSelector: "#info h1",
    alistSelect: "#list",
  },
};

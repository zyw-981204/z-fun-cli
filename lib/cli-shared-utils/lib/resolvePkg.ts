// 获取 pkg
import fs from "fs";
import path from "path";

export default function resolvePkg(context: string, jsonName = "package.json") {
  if (fs.existsSync(path.join(context, jsonName))) {
    try {
      const json = require(path.join(context, jsonName));
      return json;
    } catch (e) {
      console.log("解析错误", e);
      return {};
    }
  }
  return {};
}

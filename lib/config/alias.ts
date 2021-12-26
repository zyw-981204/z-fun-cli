// add alias
// if you want learn more you can visit next line wbsite
// https://www.npmjs.com/package/module-alias
import { root } from "../cli-shared-utils/index";
import { resolve } from "path";
const { addAliases } = require("module-alias");
addAliases({
  "@cli-shared-utils": resolve(root, "dist/cli-shared-utils/"),
  "@": resolve(root, "dist"),
});

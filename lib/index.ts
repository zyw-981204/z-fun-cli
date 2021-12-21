import { program } from "commander";

import {
  logWithSpinner,
  stopSpinner,
  chalk,
  log,
  chalkTag,
  info,
} from "./cli-shared-utils";
import { root } from "./cli-shared-utils/lib/path";
import enhanceErrorMessages from "./core/command/enhanceErrorMessages";
import { suggestCommands } from "./core/command/suggestCommand";

import type { TFetchNovelOption } from "./core/fetch/novel";
import fetchNovel from "./core/fetch/novel";

// pkg 的相对位置应该考虑 编译后的文件
// 路径为dist/lib/index.js
const pkg = require("../package.json");
const version = pkg.version;

// set version
program.version(version, "-v, --version", "output the current version");

// test command
program
  .command("test")
  .description("utils test command")
  .option("-t --time <value>", "you can spinner form times")
  .action(async (options: { time?: string }) => {
    const sleep = async (delay: number) =>
      await new Promise((resolve) => setTimeout(resolve, delay));
    logWithSpinner("睡觉中");
    await sleep(Number(options.time));
    stopSpinner(true);
    log("睡醒了");
  });

program
  .command("fetch <fetchTarget>")
  .description("下载小说")
  .option("-p --outputFileDir <outputFileDir>", "save in which path")
  .option("-n --novelName <novelName>", "download text name")
  .option("--headless", "is open the chrome hadless")
  .option("-q --quantity <quantity>", "download novel 数量")
  .option("-f --force", "是否使用缓存")
  .option("-l --limitNumber <value>", "限制同时下载的数量")
  .action(
    async (
      fetchTarget: string,
      options: Omit<TFetchNovelOption, "fetchTarget">
    ) => {
      console.log("fetchTarget", fetchTarget);
      console.log("options", options);
      log("--------------开始下载小说--------------------------");
      log("开始下载小说" + fetchTarget);
      logWithSpinner(`fetch ${chalk.yellow(fetchTarget)}`);
      await fetchNovel({
        fetchTarget,
        ...options,
      });
    }
  );

program
  .command("create <appname>")
  .description("创建 app")
  .action(async () => {
    require("./core/create/index");
  });

// command --help --no-debugger
program.commands.forEach((c) => {
  c.on("--help", () => console.log());
  c.option("--no-debugger", "if debugger, debugger log will be enabled");
});

// output help information on unknown commands
program.on("command:*", ([cmd]) => {
  program.outputHelp();
  console.log(`  ` + chalk.red(`Unknown command ${chalk.yellow(cmd)}.`));
  console.log();
  suggestCommands(cmd);
  process.exitCode = 1;
});

// enhance common error messages
enhanceErrorMessages("missingArgument", (argName: string) => {
  return `Missing required argument ${chalk.yellow(`<${argName}>`)}.`;
});

enhanceErrorMessages("unknownOption", (optionName: string) => {
  return `Unknown option ${chalk.yellow(optionName)}.`;
});

enhanceErrorMessages("optionMissingArgument", (option: any, flag: any) => {
  return (
    `Missing required argument for option ${chalk.yellow(option.flags)}` +
    (flag ? `, got ${chalk.yellow(flag)}` : ``)
  );
});
program.parse(process.argv);

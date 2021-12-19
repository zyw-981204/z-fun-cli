import { program } from "commander";

import { logWithSpinner, stopSpinner, chalk, log, chalkTag } from "./cli-shared-utils";
import enhanceErrorMessages from "./core/command/enhanceErrorMessages";
import { suggestCommands } from "./core/command/suggestCommand";

import fetchNovel from "./core/fetch/novel";

// pkg 的相对位置应该考虑 编译后的文件
// 路径为dist/lib/index.js
const pkg = require("../../package.json");
const version = pkg.version;

// set version
program.version(version, "-v, --version", "output the current version");

// test command
program
  .command("test")
  .description("utils test command")
  .option("-t --time <value>", "you can spinner form times")
  .action(async (options: { time?: string }) => {
    const sleep = async (delay: number) => await new Promise((resolve) => setTimeout(resolve, delay));
    logWithSpinner("睡觉中");
    await sleep(Number(options.time));
    stopSpinner(true);
    log("睡醒了");
  });

program
  .command("fetch <novelId>")
  .description("下载小说")
  .option("-p path <path>", "save in which path")
  .option("-u url <url>", "url")
  .option("-n -name <name>", "download text name")
  .action(async (novelId, options: { path?: string; url: string; name: string }) => {
    log("开始下载小说" + novelId);
    logWithSpinner(`fetch ${chalk.yellow(novelId)}`);
    await fetchNovel();
  });

// command --help
program.commands.forEach((c) => c.on("--help", () => console.log()));

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
    `Missing required argument for option ${chalk.yellow(option.flags)}` + (flag ? `, got ${chalk.yellow(flag)}` : ``)
  );
});
program.parse(process.argv);

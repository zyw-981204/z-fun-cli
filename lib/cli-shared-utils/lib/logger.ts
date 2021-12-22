import chalk from "chalk";
import readline from "readline";
const EventEmitter = require("events");
import stripAnsi from "strip-ansi";
import { judgeIsSlient } from "./silence";

import { stopSpinner } from "./spinner";

export const events = new EventEmitter();

type TLogType = "log" | "info" | "done" | "warn" | "error" | "debug";
function _log(type: TLogType, tag: any, message: string) {
  if (process.env.VUE_CLI_API_MODE && message) {
    events.emit("log", {
      message,
      type,
      tag,
    });
  }
}

// ANSI 转义码 转换成字符串
const format = (label: string, msg: string) => {
  return msg
    .split("\n")
    .map((line, i) => {
      return i === 0 ? `${label} ${line}` : line.padStart(stripAnsi(label).length + line.length + 1);
    })
    .join("\n");
};

export const chalkTag = (msg: string) => chalk.bgBlackBright.white.dim(` ${msg} `);

export const log = (msg = "", tag: any = null) => {
  tag ? console.log(format(chalkTag(tag), msg)) : console.log(msg);
  _log("log", tag, msg);
};

export const info = (msg: string, tag = null) => {
  console.log(format(chalk.bgBlue.black(" INFO ") + (tag ? chalkTag(tag) : ""), msg));
  _log("info", tag, msg);
};

export const done = (msg: string, tag = null) => {
  console.log(format(chalk.bgGreen.black(" DONE ") + (tag ? chalkTag(tag) : ""), msg));
  _log("done", tag, msg);
};

export const warn = (msg: string, tag = null) => {
  console.warn(format(chalk.bgYellow.black(" WARN ") + (tag ? chalkTag(tag) : ""), chalk.yellow(msg)));
  _log("warn", tag, msg);
};

export const error = (msg: any, tag = null) => {
  stopSpinner();
  console.error(format(chalk.bgRed(" ERROR ") + (tag ? chalkTag(tag) : ""), chalk.red(msg)));
  _log("error", tag, msg);
  if (msg instanceof Error) {
    console.error(msg.stack);
    _log("error", tag, msg.stack as string);
  }
};

export const debug = (msg: any, tag = null) => {
  const isSlient = judgeIsSlient();
  if (!isSlient) console.log(format(chalk.bgBlue(" debug ") + (tag ? chalkTag(tag) : ""), chalk.blue(msg)));
  _log("debug", tag, msg);
};

export const clearConsole = (title: string) => {
  if (process.stdout.isTTY) {
    const blank = "\n".repeat(process.stdout.rows);
    console.log(blank);
    readline.cursorTo(process.stdout, 0, 0);
    readline.clearScreenDown(process.stdout);
    if (title) {
      console.log(title);
    }
  }
};

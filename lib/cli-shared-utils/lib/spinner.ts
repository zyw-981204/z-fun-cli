import ora from "ora";
import chalk from "chalk";

const spinner = ora();
type TLastMsg = {
  symbol?: string;
  text?: string;
} | null;
let lastMsg: TLastMsg = null;
let isPaused = false;

export const logWithSpinner = (symbol: any, msg?: string) => {
  if (!msg) {
    msg = symbol;
    symbol = chalk.green("✔");
  }
  if (lastMsg) {
    spinner.stopAndPersist({
      symbol: lastMsg.symbol,
      text: lastMsg.text,
    });
  }
  spinner.text = " " + msg;
  lastMsg = {
    symbol: symbol + " ",
    text: msg,
  };
  spinner.start();
};

export const stopSpinner = (persist?: boolean) => {
  // 没有在旋转 return
  if (!spinner.isSpinning) {
    return;
  }

  // 有lastMsg && persist不为  fasle
  if (lastMsg && persist !== false) {
    spinner.stopAndPersist({
      symbol: lastMsg.symbol,
      text: lastMsg.text,
    });
  } else {
    spinner.stop();
  }
  lastMsg = null;
};

export const pauseSpinner = () => {
  if (spinner.isSpinning) {
    spinner.stop();
    isPaused = true;
  }
};

export const resumeSpinner = () => {
  if (isPaused) {
    spinner.start();
    isPaused = false;
  }
};

export const failSpinner = (text: string) => {
  spinner.fail(text);
};

// 增强 commander 的错误提示
import { program } from "commander";
import chalk from "chalk";

const enhanceErroeMessages = (methodName: string, log: (...args: any[]) => void) => {
  // @ts-ignore
  program.Command.prototype[methodName] = function (...args: any[]) {
    if (methodName === "unknownOption" && this._allowUnknownOption) {
      return;
    }
    this.outputHelp();
    console.log(`  ` + chalk.red(log(...args)));
    console.log();
    process.exit(1);
  };
};
export default enhanceErroeMessages;

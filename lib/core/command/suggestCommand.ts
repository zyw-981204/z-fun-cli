// 遇到unknow cmd 的提示
import { program } from "commander";
import leven from "leven";
import { chalk } from "../../cli-shared-utils";
export function suggestCommands(unknownCommand: string) {
  const availableCommands = program.commands.map((cmd: any) => cmd._name);

  let suggestion: any;

  availableCommands.forEach((cmd) => {
    const isBestMatch = leven(cmd, unknownCommand) < leven(suggestion || "", unknownCommand);
    if (leven(cmd, unknownCommand) < 3 && isBestMatch) {
      suggestion = cmd;
    }
  });

  if (suggestion) {
    console.log(`  ` + chalk.red(`Did you mean ${chalk.yellow(suggestion)}?`));
  }
}

import process from "process";
const cwd = process.cwd();
const run = () => {
  console.log(cwd);
};
export { run };

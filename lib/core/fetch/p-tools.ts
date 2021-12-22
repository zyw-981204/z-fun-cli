import pRetry from "p-retry";
import { error, resumeSpinner, stopSpinner } from "../../cli-shared-utils";
import { sleep } from "./tool";
import pLimit from "p-limit";

/**
 *
 * @param fun 传入async函数，返回 pRetry 的执行函数
 * @returns
 */
export const pRetryProvider = (originFn: () => void) => async () => {
  try {
    await originFn();
  } catch (e) {
    error(e);
    stopSpinner();
    await sleep(1000 * 2);
    throw e;
  }
};

// 消费 pRetry 执行函数
export const pRetryConsumer = async (run: () => void, retries = 10) => {
  await pRetry(run, {
    retries,
    onFailedAttempt: (error) => {
      console.log(`Attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left.`);
    },
  });
  // 关闭 spinner
  resumeSpinner();
};

// 创建 limit
export const createLimit = (l: number) => pLimit(l);

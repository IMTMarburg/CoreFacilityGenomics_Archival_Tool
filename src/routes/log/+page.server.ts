import fs from "fs";
import process from "process";

export async function load({ request, locals }) {
  let fn = process.env.DATA_DIR + "/worker.log";
  //read the file
  let stdout;
  try {
    stdout = await fs.promises.readFile(fn);
  } catch (error) {
    stdout = "could not read log file";
  }

  return {
    log: stdout,
  };
}

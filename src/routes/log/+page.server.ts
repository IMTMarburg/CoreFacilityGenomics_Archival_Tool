import { spawn } from "child_process";

export async function load({ request, locals }) {
  const proc = spawn("journalctl", ["-fu", "cfgat.service", "-n", "500"]);
  let stdout = "";
  proc.stdout.on("data", (data) => {
    console.log(`stdout:\n${data}`);
    stdout += data;
  });
  proc.stderr.on("data", (data) => {
    console.log(`stdout: ${data}`);
  });
  proc.on("exit", (code) => {
    console.log(`Process ended with ${code}`);
  });

  return {
      log: stdout,
  };
}

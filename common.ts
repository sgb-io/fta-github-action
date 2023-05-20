import { runFta } from "fta-cli";
import fs from "node:fs";

export function collectFtaResult(outputName: string) {
  const output = runFta(".", { json: true });
  const json = JSON.stringify(output);
  const outputFile = process.env["GITHUB_ENV"] as string;

  // Save to environment variable
  fs.appendFileSync(outputFile, `\n${outputName}=${json}\n`);
  console.log(`Output for "${outputName}" was completed`);
}

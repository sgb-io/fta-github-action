import fs from "node:fs";
import * as github from "@actions/github";
import Table from "cli-table3";
import dotenv from "dotenv";

interface FileReport {
  file_name: string;
  line_count: number;
  fta_score: number;
  assessment: string;
}

const outputFile = process.env["GITHUB_ENV"] as string;

console.log("outputFile content", outputFile);

dotenv.config();
dotenv.parse(fs.readFileSync(outputFile));

const octokit = github.getOctokit(process.env.GITHUB_TOKEN as string);
const baseOutput = process.env.baseResult;
const prOutput = process.env.prResult;

function diffOutput(base: string, pr: string): string {
  console.log("===== base ====");
  console.log(base);
  console.log("===== /base ====");
  const baseReports: FileReport[] = JSON.parse(JSON.parse(base));
  const prReports: FileReport[] = JSON.parse(JSON.parse(pr));

  console.log("parsed base", typeof baseReports, baseReports.length);

  const baseReportsMap = new Map(
    baseReports.map((report) => [report.file_name, report])
  );
  const prReportsMap = new Map(
    prReports.map((report) => [report.file_name, report])
  );

  const table = new Table({
    head: ["Filename", "Num lines", "FTA score", "Assessment"],
  });

  const keys = new Set([...baseReportsMap.keys(), ...prReportsMap.keys()]);

  keys.forEach((key) => {
    const baseReport = baseReportsMap.get(key);
    const prReport = prReportsMap.get(key);

    if (!baseReport) {
      table.push([
        key,
        prReport?.line_count,
        prReport?.fta_score,
        prReport?.assessment,
      ]);
    } else if (!prReport) {
      table.push([
        key,
        baseReport.line_count,
        baseReport.fta_score,
        baseReport.assessment,
      ]);
    } else {
      if (
        baseReport.line_count !== prReport.line_count ||
        baseReport.fta_score !== prReport.fta_score ||
        baseReport.assessment !== prReport.assessment
      ) {
        table.push([
          key,
          `${baseReport.line_count}, ${prReport.line_count}`,
          `${baseReport.fta_score}, ${prReport.fta_score}`,
          `${baseReport.assessment}, ${prReport.assessment}`,
        ]);
      }
    }
  });

  return table.toString();
}

(async () => {
  const diffTable = diffOutput(baseOutput, prOutput);
  const commentContent = `**FTA Results:**\n\n${diffTable}`;

  console.log("========");
  console.log(commentContent);
  console.log("========");

  await octokit.rest.issues.createComment({
    issue_number: github.context.issue.number,
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    body: commentContent,
  });
  process.exit(0);
})().catch((error) => {
  console.error("Failed to create comment", error);
  process.exit(1);
});

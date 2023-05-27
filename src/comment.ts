import fs from "node:fs";
import * as github from "@actions/github";
import dotenv from "dotenv";

interface FileReport {
  file_name: string;
  line_count: number;
  fta_score: number;
  assessment: string;
}

const outputFile = process.env["GITHUB_ENV"] as string;

dotenv.config();
dotenv.parse(fs.readFileSync(outputFile));

const octokit = github.getOctokit(process.env.GITHUB_TOKEN as string);
const baseOutput = process.env.baseResult;
const prOutput = process.env.prResult;

function diffOutput(base: string, pr: string): string {
  const baseReports: FileReport[] = JSON.parse(JSON.parse(base));
  const prReports: FileReport[] = JSON.parse(JSON.parse(pr));

  const baseReportsMap = new Map(
    baseReports.map((report) => [report.file_name, report])
  );
  const prReportsMap = new Map(
    prReports.map((report) => [report.file_name, report])
  );

  let markdownTable = "| Filename | Num lines | FTA score | Assessment |\n";
  markdownTable += "|----------|-----------|-----------|------------|\n";

  const keys = new Set([...baseReportsMap.keys(), ...prReportsMap.keys()]);

  keys.forEach((key) => {
    const baseReport = baseReportsMap.get(key);
    const prReport = prReportsMap.get(key);

    if (!baseReport) {
      // Items that got introduced in the PR
      markdownTable += `| ${key} | ${prReport?.line_count} | ${prReport?.fta_score} | ${prReport?.assessment} |  |\n`;
    } else if (!prReport) {
      // Items that got removed
      markdownTable += `| ${key} | ${baseReport.line_count} | ${baseReport.fta_score} | ${baseReport.assessment} |  |\n`;
    } else {
      // Items that existed both before and after
      if (
        baseReport.line_count !== prReport.line_count ||
        baseReport.fta_score !== prReport.fta_score ||
        baseReport.assessment !== prReport.assessment
      ) {
        const numLinesEmoji =
          prReport.line_count > baseReport.line_count
            ? ":chart_with_upwards_trend:"
            : ":chart_with_downwards_trend:";
        const ftaDiffEmoji =
          prReport.fta_score < baseReport.fta_score
            ? ":thumbsup:"
            : ":warning:";
        let assessmentEmoji = ":sparkle:";
        if (prReport.fta_score > 60) {
          assessmentEmoji = ":warning:";
        }
        if (prReport.fta_score > 50) {
          assessmentEmoji = ":toolbox:";
        }

        markdownTable += `| ${key} | ${baseReport.line_count} => ${
          prReport.line_count
        } ${numLinesEmoji} | ${baseReport.fta_score.toFixed(
          2
        )} => ${prReport.fta_score.toFixed(2)} ${ftaDiffEmoji} | _${
          baseReport.assessment
        }_ => _${prReport.assessment}_ ${assessmentEmoji}\n`;
      }
    }
  });

  return markdownTable;
}

(async () => {
  const diffTable = diffOutput(baseOutput, prOutput);
  // TODO don't comment if no changes
  const commentContent = `
**FTA Results have changed:**

${diffTable}
`;

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

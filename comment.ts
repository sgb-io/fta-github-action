import * as github from "@actions/github";
import * as Table from "cli-table3";

const [baseOutput, prOutput] = process.argv.slice(2);

interface FileReport {
  file_name: string;
  line_count: number;
  fta_score: number;
  assessment: string;
}

const octokit = github.getOctokit(process.env.GITHUB_TOKEN as string);

function diffOutput(baseOutput: string, prOutput: string): string {
  const baseReports: FileReport[] = JSON.parse(baseOutput);
  const prReports: FileReport[] = JSON.parse(prOutput);

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
  await octokit.rest.issues.createComment({
    issue_number: github.context.issue.number,
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    body: `**FTA Results:**\n\n${diffTable}`,
  });
  process.exit(0);
})().catch((error) => {
  console.error("Failed to create comment", error);
  process.exit(1);
});

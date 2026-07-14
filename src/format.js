export function printIssueList(issues) {
  const keyWidth = Math.max(...issues.map((i) => i.key.length), 0);
  const statusWidth = Math.max(
    ...issues.map((i) => (i.fields.status?.name ?? '').length),
    0
  );

  for (const issue of issues) {
    const key = issue.key.padEnd(keyWidth);
    const status = `[${(issue.fields.status?.name ?? '-').padEnd(statusWidth)}]`;
    console.log(`${key}  ${status}  ${issue.fields.summary}`);
  }
}

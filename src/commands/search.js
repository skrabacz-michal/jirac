import { clientFromEnv } from '../client.js';

export async function searchCommand(jql, opts) {
  const result = await clientFromEnv().searchIssues(jql, {
    maxResults: Number(opts.limit ?? 25),
  });

  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const issues = result.issues ?? [];
  console.log(`Showing ${issues.length} of ${result.total} issues:\n`);

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

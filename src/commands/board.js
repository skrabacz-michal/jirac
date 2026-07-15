import { clientFromEnv } from '../client.js';
import { printIssueList } from '../format.js';

export async function boardCommand(id, opts) {
  let issues = await clientFromEnv().getBoardIssuesForBoard(id);

  if (opts.status?.length) {
    const want = new Set(opts.status.map((s) => s.trim().toLowerCase()));
    issues = issues.filter((i) => want.has(i.fields.status?.name?.toLowerCase()));
  }

  if (opts.json) {
    console.log(JSON.stringify(issues, null, 2));
    return;
  }

  console.log(`Showing ${issues.length} issues:\n`);
  printIssueList(issues);
}

import { clientFromEnv } from '../client.js';
import { printIssueList } from '../format.js';

export async function boardCommand(id, opts) {
  const issues = await clientFromEnv().getBoardIssuesForBoard(id);

  if (opts.json) {
    console.log(JSON.stringify(issues, null, 2));
    return;
  }

  console.log(`Showing ${issues.length} issues:\n`);
  printIssueList(issues);
}

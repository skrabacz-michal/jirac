import { clientFromEnv } from '../client.js';
import { printIssueList } from '../format.js';

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
  printIssueList(issues);
}

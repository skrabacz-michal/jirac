import { clientFromEnv } from '../client.js';

export async function getCommand(key, opts) {
  const issue = await clientFromEnv().getIssue(key, opts.fields);

  if (opts.json) {
    console.log(JSON.stringify(issue, null, 2));
    return;
  }

  const f = issue.fields;
  console.log(`${issue.key}: ${f.summary}`);
  console.log(`  Type:     ${f.issuetype?.name ?? '-'}`);
  console.log(`  Status:   ${f.status?.name ?? '-'}`);
  console.log(`  Assignee: ${f.assignee?.displayName ?? 'Unassigned'}`);
}

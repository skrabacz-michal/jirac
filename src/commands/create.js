import {
  intro,
  outro,
  text,
  select,
  confirm,
  spinner,
  note,
  isCancel,
  cancel,
} from '@clack/prompts';
import { clientFromEnv } from '../client.js';

function bail(value) {
  if (isCancel(value)) {
    cancel('Cancelled.');
    process.exit(0);
  }
  return value;
}

async function runWizard() {
  intro('jirac — create a Jira issue');

  const project = bail(
    await text({ message: 'Project key:', initialValue: process.env.JIRA_PROJECT })
  );

  const s = spinner();
  s.start('Fetching issue types…');
  const issueTypes = await clientFromEnv().getProjectIssueTypes(project);
  s.stop('Issue types loaded.');

  const type = bail(
    await select({
      message: 'Issue type:',
      options: issueTypes.map((t) => ({ value: t.name, label: t.name })),
    })
  );

  const summary = bail(
    await text({
      message: 'Summary:',
      validate(v) {
        if (!v) return 'Summary is required';
      },
    })
  );

  const description = bail(await text({ message: 'Description (optional):' }));

  note(
    [
      `Project:     ${project}`,
      `Type:        ${type}`,
      `Summary:     ${summary}`,
      `Description: ${description || '-'}`,
    ].join('\n'),
    'Create this issue?'
  );

  const confirmed = bail(await confirm({ message: 'Create this issue?' }));
  if (!confirmed) {
    cancel('Cancelled.');
    process.exit(0);
  }

  return { project, type, summary, description };
}

export async function createCommand(opts) {
  const project = opts.project ?? process.env.JIRA_PROJECT;
  const hasAny = opts.project || opts.type || opts.summary;
  const hasAll = project && opts.type && opts.summary;

  let fields;
  if (hasAll) {
    fields = {
      project,
      type: opts.type,
      summary: opts.summary,
      description: opts.description,
    };
  } else if (hasAny) {
    throw new Error('Missing one of --project/--type/--summary — provide all three, or none to launch the wizard');
  } else {
    fields = await runWizard();
  }

  const issue = await clientFromEnv().createIssue(fields);
  const url = `${process.env.JIRA_BASE_URL}/browse/${issue.key}`;

  if (!hasAll) {
    outro(`Created ${issue.key} — ${url}`);
  }

  if (opts.json) {
    console.log(JSON.stringify(issue, null, 2));
  } else if (hasAll) {
    console.log(`Created ${issue.key}`);
    console.log(url);
  }
}

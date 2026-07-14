import { clientFromEnv } from '../client.js';

export async function projectCommand(key, opts) {
  const project = await clientFromEnv().getProject(key);

  if (opts.json) {
    console.log(JSON.stringify(project, null, 2));
    return;
  }

  const types = project.issueTypes.filter((t) => !t.subtask).map((t) => t.name);
  console.log(`${project.key}: ${project.name}`);
  console.log(`  Lead:        ${project.lead?.displayName ?? '-'}`);
  console.log(`  Type:        ${project.projectTypeKey ?? '-'}`);
  console.log(`  Issue types: ${types.join(', ')}`);
}

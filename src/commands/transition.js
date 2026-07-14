import { clientFromEnv } from '../client.js';

export async function transitionCommand(key, status, opts) {
  const client = clientFromEnv();
  const transitions = await client.getTransitions(key);

  const match = transitions.find(
    (t) =>
      t.to?.name.toLowerCase() === status.toLowerCase() ||
      t.name.toLowerCase() === status.toLowerCase()
  );

  if (!match) {
    const available = transitions.map((t) => t.to?.name ?? t.name).join(', ');
    throw new Error(`No transition to "${status}" from current status. Available: ${available}`);
  }

  await client.transitionIssue(key, match.id);

  const newStatus = match.to?.name ?? match.name;
  if (opts.json) {
    console.log(JSON.stringify({ key, status: newStatus }, null, 2));
    return;
  }

  console.log(`${key} -> ${newStatus}`);
}

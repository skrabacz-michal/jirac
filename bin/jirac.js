#!/usr/bin/env bun
import { Command } from 'commander';
import pkg from '../package.json' with { type: 'json' };
import { getCommand } from '../src/commands/get.js';
import { searchCommand } from '../src/commands/search.js';
import { createCommand } from '../src/commands/create.js';
import { projectCommand } from '../src/commands/project.js';
import { transitionCommand } from '../src/commands/transition.js';
import { boardCommand } from '../src/commands/board.js';

function withErrorHandling(fn) {
  return async (...args) => {
    try {
      await fn(...args);
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  };
}

const program = new Command();

program.name('jirac').description('Minimal self-hosted Jira CLI').version(pkg.version);

program
  .command('get <key>')
  .description('Get a single issue')
  .option('--fields <csv>', 'Comma-separated list of fields to return')
  .option('--json', 'Print raw JSON')
  .action(withErrorHandling(getCommand));

program
  .command('search <jql>')
  .description('Search issues by JQL')
  .option('--limit <n>', 'Max results', '25')
  .option('--json', 'Print raw JSON')
  .action(withErrorHandling(searchCommand));

program
  .command('create')
  .description('Create an issue (interactive wizard if no flags given)')
  .option('--project <key>', 'Project key')
  .option('--type <type>', 'Issue type')
  .option('--summary <summary>', 'Issue summary')
  .option('--description <description>', 'Issue description')
  .option('--json', 'Print raw JSON')
  .action(withErrorHandling(createCommand));

program
  .command('project <key>')
  .description('Get project details')
  .option('--json', 'Print raw JSON')
  .action(withErrorHandling(projectCommand));

program
  .command('transition <key> <status>')
  .description('Change an issue\'s status (e.g. "In Progress", "Done")')
  .option('--json', 'Print raw JSON')
  .action(withErrorHandling(transitionCommand));

program
  .command('board <id>')
  .description('List issues on a board\'s active sprint(s), or all board issues if none is active')
  .option('--status <status>', 'Filter by status name (case-insensitive; repeatable or comma-separated)', (v, acc) => acc.concat(v.split(',')), [])
  .option('--json', 'Print raw JSON')
  .action(withErrorHandling(boardCommand));

program.parse();

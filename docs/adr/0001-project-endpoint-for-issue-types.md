# Use the project endpoint, not createmeta, for the create wizard's issue types

The interactive `create` wizard needs to populate its issue-type prompt with
real options for the target project, instead of a hardcoded Task/Bug/Story
list. Jira exposes two ways to get this: `GET /rest/api/2/issue/createmeta`
(what Jira's own create-issue screen uses, but heavier and effectively
legacy) or `GET /rest/api/2/project/{key}`, whose response already includes
an `issueTypes` array. We chose the project endpoint — one simple call,
filtered to drop `subtask: true` entries (this wizard doesn't support
sub-tasks). If stricter create-time accuracy (screen/permission-restricted
types) is ever needed, revisit `createmeta`.

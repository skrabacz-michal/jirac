const DEFAULT_SEARCH_FIELDS = ['summary', 'status', 'assignee', 'issuetype'];

export class JiraClient {
  constructor({ baseUrl, token }) {
    if (!baseUrl) throw new Error('Missing JIRA_BASE_URL');
    if (!token) throw new Error('Missing JIRA_TOKEN');
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.token = token;
  }

  async request(path, { method = 'GET', body } = {}) {
    const headers = {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/json',
    };
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : undefined;

    if (!res.ok) {
      const detail = data?.errorMessages?.join('; ') || data?.message;
      const suffix = detail ? `: ${detail}` : '';
      throw new Error(`${res.status} ${res.statusText}${suffix}`);
    }

    return data;
  }

  getIssue(key, fields) {
    const query = fields ? `?fields=${encodeURIComponent(fields)}` : '';
    return this.request(`/rest/api/2/issue/${key}${query}`);
  }

  searchIssues(jql, { maxResults = 25, fields = DEFAULT_SEARCH_FIELDS } = {}) {
    return this.request('/rest/api/2/search', {
      method: 'POST',
      body: { jql, maxResults, fields },
    });
  }

  createIssue({ project, type, summary, description }) {
    return this.request('/rest/api/2/issue', {
      method: 'POST',
      body: {
        fields: {
          project: { key: project },
          issuetype: { name: type },
          summary,
          description,
        },
      },
    });
  }

  getProject(projectKey) {
    return this.request(`/rest/api/2/project/${projectKey}`);
  }

  async getProjectIssueTypes(projectKey) {
    const project = await this.getProject(projectKey);
    return project.issueTypes.filter((t) => !t.subtask);
  }

  async getTransitions(key) {
    const data = await this.request(`/rest/api/2/issue/${key}/transitions`);
    return data.transitions;
  }

  transitionIssue(key, transitionId) {
    return this.request(`/rest/api/2/issue/${key}/transitions`, {
      method: 'POST',
      body: { transition: { id: transitionId } },
    });
  }

  async paginate(path, itemsKey) {
    const items = [];
    let startAt = 0;
    for (;;) {
      const sep = path.includes('?') ? '&' : '?';
      const page = await this.request(`${path}${sep}startAt=${startAt}`);
      items.push(...page[itemsKey]);
      if (page.isLast || items.length >= page.total) break;
      startAt += page[itemsKey].length;
    }
    return items;
  }

  getActiveSprints(boardId) {
    return this.paginate(`/rest/agile/1.0/board/${boardId}/sprint?state=active`, 'values');
  }

  getSprintIssues(sprintId) {
    return this.paginate(`/rest/agile/1.0/sprint/${sprintId}/issue`, 'issues');
  }

  getBoardIssues(boardId) {
    return this.paginate(`/rest/agile/1.0/board/${boardId}/issue`, 'issues');
  }

  async getBoardIssuesForBoard(boardId) {
    const sprints = await this.getActiveSprints(boardId);
    if (sprints.length === 0) return this.getBoardIssues(boardId);

    const perSprint = await Promise.all(sprints.map((s) => this.getSprintIssues(s.id)));
    return perSprint.flat();
  }
}

export function clientFromEnv() {
  return new JiraClient({
    baseUrl: process.env.JIRA_BASE_URL,
    token: process.env.JIRA_TOKEN,
  });
}

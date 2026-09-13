// Minimal GitHub Contents API client. The repo is the "database": data/trip.json
// is read and written through this file when a token is configured.

const API = 'https://api.github.com';

const headers = (token) => ({
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${token}`,
  'X-GitHub-Api-Version': '2022-11-28',
});

const utf8ToBase64 = (str) => {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
};
const base64ToUtf8 = (b64) => {
  const bin = atob(b64.replace(/\n/g, ''));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

export class GitHubError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

async function request(url, token, init = {}) {
  let res;
  try {
    res = await fetch(url, { ...init, headers: { ...headers(token), ...(init.headers || {}) } });
  } catch (e) {
    throw new GitHubError('Network error talking to GitHub. Are you online?', 0);
  }
  if (res.status === 401) throw new GitHubError('GitHub rejected the token (401). Check it in Settings.', 401);
  if (res.status === 403) throw new GitHubError('GitHub said forbidden (403). The token may lack "Contents: read and write" on this repo, or you hit a rate limit.', 403);
  if (res.status === 404) throw new GitHubError('Not found (404). Check the owner, repo, branch and file path in Settings, and that the token can see the repo.', 404);
  if (res.status === 409) throw new GitHubError('GitHub reported a conflict (409). Pull the latest version and try again.', 409);
  if (res.status === 422) {
    let detail = '';
    try { detail = (await res.json()).message || ''; } catch {}
    throw new GitHubError(`GitHub could not apply the change (422). ${detail}`, 422);
  }
  if (!res.ok) throw new GitHubError(`GitHub error ${res.status}.`, res.status);
  return res;
}

export async function getFile({ owner, repo, branch, path, token }) {
  const url = `${API}/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}&t=${Date.now()}`;
  const res = await request(url, token, { cache: 'no-store' });
  const json = await res.json();
  const text = base64ToUtf8(json.content || '');
  return { sha: json.sha, text, data: JSON.parse(text) };
}

export async function putFile({ owner, repo, branch, path, token, sha, text, message }) {
  const url = `${API}/repos/${owner}/${repo}/contents/${path}`;
  const body = { message, content: utf8ToBase64(text), branch };
  if (sha) body.sha = sha;
  const res = await request(url, token, { method: 'PUT', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
  const json = await res.json();
  return { sha: json.content?.sha, commitUrl: json.commit?.html_url };
}

export async function checkToken({ owner, repo, token }) {
  const res = await request(`${API}/repos/${owner}/${repo}`, token, { cache: 'no-store' });
  const json = await res.json();
  return { ok: true, private: !!json.private, defaultBranch: json.default_branch, canPush: !!json.permissions?.push };
}

const API = '/api';
let csrfToken = null;
let csrfRequest = null;

/** @typedef {Error & { status?: number, data?: unknown }} ApiError */

async function getCsrfToken() {
  if (csrfToken) return csrfToken;
  if (!csrfRequest) {
    csrfRequest = fetch(`${API}/auth/csrf`, { credentials: 'include' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.csrf_token) throw new Error('Could not initialize a secure session.');
        csrfToken = data.csrf_token;
        return csrfToken;
      })
      .finally(() => { csrfRequest = null; });
  }
  return csrfRequest;
}

/** @param {string} path @param {{ method?: string, body?: unknown, csrf?: boolean }} options */
async function request(path, { method = 'GET', body, csrf = false } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (csrf) headers['X-CSRF-Token'] = await getCsrfToken();
  const response = await fetch(`${API}${path}`, {
    method,
    credentials: 'include',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    /** @type {ApiError} */
    const error = new Error(data.error || 'Permintaan tidak dapat diproses.');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

function queryString(values) {
  const params = new URLSearchParams();
  if (values.filter && Object.keys(values.filter).length) params.set('filter', JSON.stringify(values.filter));
  if (values.sort) params.set('sort', values.sort);
  if (values.limit !== undefined) params.set('limit', String(values.limit));
  if (values.offset !== undefined) params.set('offset', String(values.offset));
  const result = params.toString();
  return result ? `?${result}` : '';
}

function entityClient(name) {
  const root = `/entities/${encodeURIComponent(name)}`;
  return {
    filter: (filter = {}, options = {}) => request(`${root}${queryString({ ...options, filter })}`),
    list: (options = {}) => request(`${root}${queryString(options)}`),
    get: (id) => request(`${root}/${encodeURIComponent(id)}`),
    create: (item) => request(root, { method: 'POST', body: item, csrf: true }),
    update: (id, changes) => request(`${root}/${encodeURIComponent(id)}`, { method: 'PUT', body: changes, csrf: true }),
    delete: (id) => request(`${root}/${encodeURIComponent(id)}`, { method: 'DELETE', csrf: true }),
    count: async (filter = {}) => (await request(`${root}/count`, { method: 'POST', body: { query: filter }, csrf: true })).count,
    aggregate: (input = {}) => request(`${root}/aggregate`, { method: 'POST', body: input, csrf: true }),
    bulkCreate: (items) => request(`${root}/bulk`, { method: 'POST', body: { action: 'create', items }, csrf: true }),
    bulkUpdate: (items) => request(`${root}/bulk`, { method: 'POST', body: { action: 'update', items }, csrf: true }),
    deleteMany: (query) => request(`${root}/delete-many`, { method: 'POST', body: { query }, csrf: true }),
  };
}

const entityCache = new Map();
/** @type {Record<string, any>} */
const entities = new Proxy({}, {
  get(_target, name) {
    if (typeof name !== 'string') return undefined;
    if (!entityCache.has(name)) entityCache.set(name, entityClient(name));
    return entityCache.get(name);
  },
});

const auth = {
  async me() {
    const session = await request('/auth/session');
    if (!session.authenticated) {
      /** @type {ApiError} */
      const error = new Error('Authentication required');
      error.status = 401;
      throw error;
    }
    return { ...session.account, role: session.account.platform_role, memberships: session.memberships };
  },
  loginViaEmailPassword: (email, password) => request('/auth/login', { method: 'POST', body: { email, password }, csrf: true }),
  register: (input) => request('/auth/register', { method: 'POST', body: input, csrf: true }),
  resetPasswordRequest: (email) => request('/auth/password/forgot', { method: 'POST', body: { email }, csrf: true }),
  resetPassword: ({ resetToken, newPassword }) => request('/auth/password/reset', { method: 'POST', body: { token: resetToken, new_password: newPassword }, csrf: true }),
  logout: async (redirectTo) => {
    await request('/auth/logout', { method: 'POST', csrf: true }).catch(() => {});
    csrfToken = null;
    if (redirectTo) window.location.assign('/login');
  },
  async startGoogle(inviteToken = '', returnTo = '/') {
    const token = await getCsrfToken();
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `${API}/auth/google/start`;
    for (const [name, value] of Object.entries({ csrf_token: token, invite_token: inviteToken, return_to: returnTo })) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    }
    document.body.appendChild(form);
    form.submit();
  },
};

const functions = {
  async invoke(name, input = {}) {
    if (name === 'resolveAccess') {
      const session = await request('/auth/session');
      return { data: { linked: session.authenticated && session.memberships.length > 0, member: session.memberships[0] || null } };
    }
    if (name === 'manageMember') return { data: await request('/admin/members/manage', { method: 'POST', body: input, csrf: true }) };
    throw new Error(`Function ${name} is not available in the PHP API.`);
  },
};

export const base44 = { auth, entities, functions, app: { getPublicSettings: async () => ({}) } };
export { request as apiRequest };

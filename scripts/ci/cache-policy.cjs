// Cache families have stable paths; bump the action's schema when those paths change.
async function state(github, context) {
  const { repo, payload, eventName, ref, sha } = context;
  if (eventName === 'pull_request') {
    const { data: pr } = await github.rest.pulls.get({
      ...repo,
      pull_number: payload.pull_request.number,
    });
    if (pr.head.repo?.full_name !== `${repo.owner}/${repo.repo}`) return 'stale';
    if (pr.state === 'closed') return 'closed';
    return pr.head.sha === payload.pull_request.head.sha ? 'current' : 'stale';
  }
  if (
    !['push', 'workflow_dispatch'].includes(eventName) ||
    ref !== `refs/heads/${payload.repository.default_branch}`
  )
    return 'stale';
  const { data } = await github.rest.git.getRef({ ...repo, ref: ref.slice(5) });
  return data.object.sha === sha ? 'current' : 'stale';
}

async function prune(github, context, { prefix, key }, confirmed) {
  // cache/save warns rather than failing on upload errors. A compatible exact
  // lookup must succeed first; it can also find a newly available base snapshot.
  const status = await state(github, context);
  // Close cleanup can finish while an upload is in flight. Sweep that late
  // family here even if lookup failed; a closed PR needs no replacement cache.
  if (status !== 'closed' && (status !== 'current' || !confirmed)) return;
  const caches = await github.paginate(github.rest.actions.getActionsCacheList, {
    ...context.repo,
    ref: context.ref,
    key: prefix,
    per_page: 100,
  });
  // REST cannot identify the lookup's version. Prefer one newest archive;
  // an incompatible duplicate can cost a cold rebuild, never stale output.
  const keep = caches
    .filter((cache) => cache.ref === context.ref && cache.key === key)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || b.id - a.id)[0]?.id;
  for (const cache of caches) {
    if (cache.ref !== context.ref || !cache.key.startsWith(prefix)) continue;
    if (status === 'current' && cache.id === keep) continue;
    // Superseded runs must not prune a newer commit's cache.
    if ((await state(github, context)) !== status) return;
    try {
      await github.rest.actions.deleteActionsCacheById({ ...context.repo, cache_id: cache.id });
    } catch (error) {
      if (error.status !== 404) throw error; // Another job may have pruned it already.
    }
  }
}
module.exports = { state, prune };

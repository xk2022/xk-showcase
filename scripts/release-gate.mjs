const fullSha = /^[a-f\d]{40}$/i;
const credentialKey = /(?:TOKEN|SECRET|PASSWORD|AUTHORIZATION|API_KEY|PRIVATE_KEY|ACCESS_KEY)/i;
const runtimeKeys = new Set(['PATH', 'HOME', 'TMPDIR', 'TMP', 'TEMP', 'LANG', 'LC_ALL', 'TZ', 'SystemRoot', 'ComSpec', 'PATHEXT', 'NPM_CONFIG_CACHE', 'npm_config_cache', 'NODE_EXTRA_CA_CERTS', 'SSL_CERT_FILE', 'SSL_CERT_DIR', 'NODE_USE_ENV_PROXY']);
const proxyKeys = new Set(['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'NO_PROXY', 'http_proxy', 'https_proxy', 'all_proxy', 'no_proxy']);

// Source install/build scripts receive runtime settings and explicit public config only.
// The hub's API token and Actions credentials never enter git/npm child environments.
export function sourceEnvironment(environment = process.env, configured = {}) {
  const clean = {};
  for (const [key, value] of Object.entries(environment)) {
    if (runtimeKeys.has(key)) clean[key] = value;
    if (proxyKeys.has(key)) {
      if (!value) continue;
      if (/no_proxy/i.test(key)) clean[key] = value;
      else {
        let proxy;
        try { proxy = new URL(value); } catch { throw new Error(`Invalid proxy runtime setting: ${key}`); }
        if (!proxy.username && !proxy.password) clean[key] = value;
      }
    }
  }
  for (const [key, value] of Object.entries(configured)) {
    if (credentialKey.test(key) || !/^[a-zA-Z_][a-zA-Z\d_]*$/.test(key) || typeof value !== 'string' || /[\r\n\0]/.test(value)) throw new Error(`Source env must contain public build settings only: ${key}`);
    if (proxyKeys.has(key) && !/no_proxy/i.test(key)) {
      let proxy;
      try { proxy = new URL(value); } catch { throw new Error(`Invalid public proxy setting: ${key}`); }
      if (proxy.username || proxy.password) throw new Error(`Source env must not contain proxy credentials: ${key}`);
    }
    clean[key] = value;
  }
  return { ...clean, NEXT_TELEMETRY_DISABLED: '1' };
}

export function validateReleaseConfiguration(site) {
  if (typeof site.ref !== 'string' || !site.ref || site.ref.startsWith('-') || !/^[a-zA-Z\d_./-]+$/.test(site.ref) || site.ref.includes('..')) throw new Error(`Invalid source ref: ${site.slug}`);
  if (site.releaseGate === undefined) return;
  if (!site.releaseGate || !/^\.github\/workflows\/[a-zA-Z\d_-]+\.ya?ml$/.test(site.releaseGate.workflow) || typeof site.releaseGate.job !== 'string' || !site.releaseGate.job.trim()) throw new Error(`Invalid release gate: ${site.slug}`);
}

export async function verifyRelease(site, sha, request) {
  validateReleaseConfiguration(site);
  if (!site.releaseGate) return undefined;
  if (!fullSha.test(sha)) throw new Error(`Release gate requires an exact commit SHA: ${site.slug}`);
  if (!/^xk2022\/[a-zA-Z\d_-]+$/.test(site.repository)) throw new Error('Release gate requires a trusted XK repository.');
  if (typeof request !== 'function') throw new Error('Release gate requires the Hub GitHub metadata reader.');
  const prefix = `repos/${site.repository}`;
  const workflow = site.releaseGate.workflow.split('/').at(-1);
  const runs = await request(`${prefix}/actions/workflows/${workflow}/runs?head_sha=${sha}&event=push&per_page=100`);
  if (!Array.isArray(runs.workflow_runs)) throw new Error(`Release gate returned invalid workflow metadata: ${site.slug}`);
  if (runs.total_count > 100) throw new Error(`Release gate workflow metadata exceeds the supported page size: ${site.slug}`);
  const matching = runs.workflow_runs.filter(run => run.head_sha === sha && run.path === site.releaseGate.workflow && run.event === 'push' && run.head_repository?.full_name === site.repository);
  // A newer queued/failed run supersedes an older success for the same SHA.
  const latest = matching.sort((a, b) => (b.run_number - a.run_number) || (b.id - a.id))[0];
  if (!latest || !Number.isSafeInteger(latest.id) || !Number.isSafeInteger(latest.run_attempt) || latest.run_attempt < 1 || latest.status !== 'completed' || latest.conclusion !== 'success') throw new Error(`Release gate not satisfied for ${site.slug}@${sha}: ${latest ? `${latest.status}/${latest.conclusion || 'pending'}` : 'no matching successful workflow'}.`);
  const jobs = await request(`${prefix}/actions/runs/${latest.id}/attempts/${latest.run_attempt}/jobs?per_page=100`);
  if (!Array.isArray(jobs.jobs) || jobs.total_count > 100) throw new Error(`Release gate returned incomplete job metadata: ${site.slug}`);
  const required = jobs.jobs.filter(job => job.name === site.releaseGate.job && job.head_sha === sha && job.run_id === latest.id && job.run_attempt === latest.run_attempt);
  if (!required?.length || required.some(job => job.status !== 'completed' || job.conclusion !== 'success')) throw new Error(`Release gate job ${site.releaseGate.job} is not successful for ${site.slug}@${sha}.`);
  const current = await request(`${prefix}/actions/runs/${latest.id}`);
  if (current.head_sha !== sha || current.path !== site.releaseGate.workflow || current.event !== 'push' || current.run_attempt !== latest.run_attempt || current.status !== 'completed' || current.conclusion !== 'success') throw new Error(`Release gate changed during verification: ${site.slug}@${sha}.`);
  return { sha, workflow: site.releaseGate.workflow, job: site.releaseGate.job, run_id: latest.id, run_attempt: latest.run_attempt, run_url: `https://github.com/${site.repository}/actions/runs/${latest.id}`, verified_at: new Date().toISOString() };
}

export function validateReleaseEvidence(site, sha, release) {
  if (!site.releaseGate) {
    if (release !== undefined) throw new Error(`Unexpected release evidence: ${site.slug}`);
    return;
  }
  if (!fullSha.test(sha) || release?.sha !== sha || release.workflow !== site.releaseGate.workflow || release.job !== site.releaseGate.job || !Number.isSafeInteger(release.run_id) || release.run_id < 1 || !Number.isSafeInteger(release.run_attempt) || release.run_attempt < 1 || (fullSha.test(site.ref) && sha.toLowerCase() !== site.ref.toLowerCase())) throw new Error(`Release evidence does not match configured source: ${site.slug}`);
}

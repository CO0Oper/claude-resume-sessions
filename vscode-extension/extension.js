// Source of truth: ~/.claude/open-sessions, written by hooks/track_open_session.py
const vscode = require('vscode'), fs = require('fs'), path = require('path'), os = require('os');

const claudeDir = path.join(os.homedir(), '.claude');
const norm = p => (process.platform === 'win32' ? path.resolve(p).toLowerCase() : path.resolve(p));
const UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

function readJsonDir(dir) {
  let names = [];
  try { names = fs.readdirSync(dir); } catch { return []; }
  return names.filter(n => n.endsWith('.json')).flatMap(n => {
    try { return [JSON.parse(fs.readFileSync(path.join(dir, n), 'utf8'))]; } catch { return []; }
  });
}

function isAlive(pid) {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

// Latest /rename title, else latest auto title. Scans every project: a session's folder can differ from its cwd.
// ponytail: reads whole transcripts (up to ~100 MB) at startup, tail-read if windows open slowly.
function titleOf(id) {
  const projects = path.join(claudeDir, 'projects');
  try {
    const file = fs.readdirSync(projects).map(d => path.join(projects, d, `${id}.jsonl`)).find(f => fs.existsSync(f));
    const text = fs.readFileSync(file, 'utf8');
    const last = re => [...text.matchAll(re)].pop();
    const m = last(/"customTitle":("(?:[^"\\]|\\.)*")/g) || last(/"aiTitle":("(?:[^"\\]|\\.)*")/g);
    return m && JSON.parse(m[1]);
  } catch { return null; }
}

const liveIds = () => new Set(readJsonDir(path.join(claudeDir, 'sessions')).filter(s => isAlive(s?.pid)).map(s => s.sessionId));

// Each window notes once a minute which tracked sessions are running in it, and on open resumes the
// ones running when it last closed. Shutdown can kill terminals before the final note, so a session
// counts if either of the last two notes saw it.
// ponytail: a session closed up to 2 minutes before VS Code closed comes back too.
const KEY = 'sessions', BEAT = 60e3, GRACE = 2 * BEAT;

exports.activate = context => {
  const folders = (vscode.workspace.workspaceFolders || []).map(f => norm(f.uri.fsPath));
  const inFolder = p => typeof p === 'string' && folders.some(f => norm(p) === f || norm(p).startsWith(f + path.sep));
  const state = context.workspaceState;

  const beat = () => {
    const live = liveIds(), now = Date.now(), seen = {};
    for (const [id, s] of Object.entries(state.get(KEY)?.seen || {})) if (UUID.test(id) && s?.t >= now - GRACE) seen[id] = s;
    for (const s of readJsonDir(path.join(claudeDir, 'open-sessions'))) {
      if (UUID.test(s?.id) && live.has(s.id) && inFolder(s.cwd)) seen[s.id] = { cwd: s.cwd, t: now };
    }
    state.update(KEY, { beat: now, seen });
  };
  const timer = setInterval(beat, BEAT);
  context.subscriptions.push({ dispose: () => clearInterval(timer) });

  const last = state.get(KEY);
  if (!last) return beat(); // first run: nothing to restore yet
  // A window reload keeps terminals running, so live sessions must not be resumed twice.
  const running = liveIds();
  for (const [id, s] of Object.entries(last.seen || {})) {
    // The id is typed into a shell, so anything but a UUID is skipped.
    if (!UUID.test(id) || !s || s.t < last.beat - GRACE || running.has(id) || !inFolder(s.cwd)) continue;
    vscode.window.createTerminal({
      name: titleOf(id) || `claude ${id.slice(0, 8)}`,
      cwd: s.cwd,
      env: { NoDefaultCurrentDirectoryInExePath: '1' }, // stops cmd.exe running a claude.cmd planted in the project
    }).sendText(`claude --resume ${id}`);
  }
};

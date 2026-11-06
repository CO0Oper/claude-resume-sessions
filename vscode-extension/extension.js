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

exports.activate = () => {
  const folders = (vscode.workspace.workspaceFolders || []).map(f => norm(f.uri.fsPath));
  // A window reload keeps terminals running, so live sessions must not be resumed twice.
  const running = new Set(readJsonDir(path.join(claudeDir, 'sessions')).filter(s => isAlive(s?.pid)).map(s => s.sessionId));
  for (const s of readJsonDir(path.join(claudeDir, 'open-sessions'))) {
    // The id is typed into a shell, so anything but a UUID is skipped.
    if (!UUID.test(s?.id) || typeof s.cwd !== 'string') continue;
    const cwd = norm(s.cwd);
    if (running.has(s.id) || !folders.some(f => cwd === f || cwd.startsWith(f + path.sep))) continue;
    vscode.window.createTerminal({
      name: titleOf(s.id) || `claude ${s.id.slice(0, 8)}`,
      cwd: s.cwd,
      env: { NoDefaultCurrentDirectoryInExePath: '1' }, // stops cmd.exe running a claude.cmd planted in the project
    }).sendText(`claude --resume ${s.id}`);
  }
};

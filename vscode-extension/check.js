// Run: node vscode-extension/check.js  (stubs vscode, uses a throwaway home)
const assert = require('assert'), fs = require('fs'), os = require('os'), path = require('path'), Module = require('module');
const { spawnSync } = require('child_process');
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'resume-check-'));
process.env.USERPROFILE = process.env.HOME = home;
const write = (dir, name, obj) => {
  fs.mkdirSync(path.join(home, '.claude', dir), { recursive: true });
  fs.writeFileSync(path.join(home, '.claude', dir, name), JSON.stringify(obj));
};
const uuid = c => `${c.repeat(8)}-0000-4000-8000-000000000000`;
const [dead, sub, live, other, untitled] = ['a', 'b', 'c', 'd', 'e'].map(uuid);
const proj = path.join(home, 'Proj');
write('open-sessions', 'dead.json', { id: dead, cwd: proj });
write('open-sessions', 'sub.json', { id: sub, cwd: path.join(proj, 'works') });
write('open-sessions', 'live.json', { id: live, cwd: proj });
write('open-sessions', 'other.json', { id: other, cwd: proj + '2' }); // sibling prefix must not match
write('open-sessions', 'untitled.json', { id: untitled, cwd: proj });
write('sessions', '1.json', { pid: process.pid, sessionId: live });
write('sessions', '2.json', { pid: 999999, sessionId: dead }); // stale registry entry
write('sessions', '3.json', null);
// Entries that must be skipped without stopping the others.
fs.writeFileSync(path.join(home, '.claude', 'open-sessions', 'bad.json'), '{oops');
write('open-sessions', 'null.json', null);
write('open-sessions', 'nocwd.json', { id: uuid('f') });
write('open-sessions', 'number.json', { id: 7, cwd: proj });
write('open-sessions', 'inject.json', { id: 'x & calc.exe', cwd: proj });

const transcript = (id, ...recs) => {
  const dir = path.join(home, '.claude', 'projects', 'parent-folder');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${id}.jsonl`), recs.map(r => JSON.stringify(r)).join('\n'));
};
transcript(dead, { type: 'custom-title', customTitle: 'my "name"' }, { type: 'ai-title', aiTitle: 'auto' });
transcript(sub, { type: 'ai-title', aiTitle: 'old' }, { type: 'user', text: '"aiTitle":"quoted in chat"' }, { type: 'ai-title', aiTitle: 'new' });

const sent = [];
const folder = process.platform === 'win32' ? proj.toUpperCase() : proj; // Windows paths are case-insensitive
const vscode = {
  workspace: { workspaceFolders: [{ uri: { fsPath: folder } }] },
  window: { createTerminal: o => ({ sendText: t => sent.push([o.cwd, t, o.name, o.env]) }) },
};
const load = Module._load;
Module._load = (r, ...a) => r === 'vscode' ? vscode : load(r, ...a);
require('./extension.js').activate();
assert.deepStrictEqual(sent.map(s => s[1]).sort(), [dead, sub, untitled].map(id => `claude --resume ${id}`));
assert.strictEqual(sent.find(s => s[1].endsWith(sub))[0], path.join(proj, 'works'));
assert.deepStrictEqual(sent.map(s => s[2]).sort(), ['claude eeeeeeee', 'my "name"', 'new']);
assert(sent.every(s => s[3].NoDefaultCurrentDirectoryInExePath === '1'));

// The hook must not write outside open-sessions.
const hook = id => spawnSync(process.platform === 'win32' ? 'python' : 'python3', [path.join(__dirname, '..', 'hooks', 'track_open_session.py')], {
  input: JSON.stringify({ hook_event_name: 'SessionStart', session_id: id, cwd: proj }),
  env: { ...process.env, TERM_PROGRAM: 'vscode', CLAUDE_CODE_ENTRYPOINT: 'cli' },
});
assert.strictEqual(hook('../../planted').status, 0);
assert(!fs.existsSync(path.join(home, 'planted.json')));
assert.strictEqual(hook(uuid('1')).status, 0);
assert(fs.existsSync(path.join(home, '.claude', 'open-sessions', `${uuid('1')}.json`)));

fs.rmSync(home, { recursive: true, force: true });
console.log('ok');

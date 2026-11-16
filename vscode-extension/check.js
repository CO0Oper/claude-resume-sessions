// Run: node vscode-extension/check.js  (stubs vscode, uses a throwaway home)
const assert = require('assert'), fs = require('fs'), os = require('os'), path = require('path'), Module = require('module');
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'resume-check-'));
process.env.USERPROFILE = process.env.HOME = home;
const write = (dir, name, obj) => {
  fs.mkdirSync(path.join(home, '.claude', dir), { recursive: true });
  fs.writeFileSync(path.join(home, '.claude', dir, name), JSON.stringify(obj));
};
const uuid = c => `${c.repeat(8)}-0000-4000-8000-000000000000`;
const [dead, sub, live, other, untitled, old, closed] = ['a', 'b', 'c', 'd', 'e', 'f', '1'].map(uuid);
const proj = path.join(home, 'Proj');
const now = Date.now(), MIN = 60e3;

// What the window noted before it last closed (last note 1 minute after `dead` was last seen).
const memory = new Map([['restore', { beat: now - MIN, seen: {
  [dead]: { cwd: proj, t: now - 1.5 * MIN },
  [sub]: { cwd: path.join(proj, 'works'), t: now - MIN },
  [untitled]: { cwd: proj, t: now - MIN },
  [live]: { cwd: proj, t: now - MIN }, // still running after a window reload
  [other]: { cwd: proj + '2', t: now - MIN }, // sibling prefix must not match
  [old]: { cwd: proj, t: now - 60 * MIN }, // closed long before VS Code closed
  'x & calc.exe': { cwd: proj, t: now - MIN },
  [uuid('2')]: null,
  [uuid('3')]: { t: now - MIN },
} }]]);
const context = {
  subscriptions: [],
  workspaceState: { get: k => memory.get(k), update: (k, v) => memory.set(k, v) },
};

// Claude's registry: `live` and `other` are running; `closed` is a stale entry; the rest must be ignored.
write('sessions', '1.json', { pid: process.pid, sessionId: live, cwd: proj, entrypoint: 'cli', kind: 'interactive' });
write('sessions', '4.json', { pid: process.pid, sessionId: other, cwd: proj + '2', entrypoint: 'cli', kind: 'interactive' });
write('sessions', '2.json', { pid: 999999, sessionId: closed, cwd: proj, entrypoint: 'cli', kind: 'interactive' });
write('sessions', '5.json', { pid: process.pid, sessionId: uuid('5'), cwd: proj, entrypoint: 'claude-vscode', kind: 'interactive' });
write('sessions', '6.json', { pid: process.pid, sessionId: uuid('6'), cwd: proj, entrypoint: 'cli', kind: 'print' });
write('sessions', '7.json', { pid: process.pid, sessionId: '../x', cwd: proj, entrypoint: 'cli', kind: 'interactive' });
write('sessions', '3.json', null);
fs.writeFileSync(path.join(home, '.claude', 'sessions', 'bad.json'), '{oops');

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
let tick;
global.setInterval = fn => (tick = fn, 0);
const ext = require('./extension.js');
ext.activate(context);
assert.deepStrictEqual(sent.map(s => s[1]).sort(), [dead, sub, untitled].map(id => `claude --resume ${id}`));
assert.strictEqual(sent.find(s => s[1].endsWith(sub))[0], path.join(proj, 'works'));
assert.deepStrictEqual(sent.map(s => s[2]).sort(), ['claude eeeeeeee', 'my "name"', 'new']);
assert(sent.every(s => s[3].NoDefaultCurrentDirectoryInExePath === '1'));

// A note keeps running sessions in this window plus recent ones, and forgets old and closed ones.
tick();
const seen = Object.keys(memory.get('restore').seen).sort();
assert.deepStrictEqual(seen, [dead, sub, untitled, live, other, uuid('3')].sort());
assert(memory.get('restore').seen[live].t >= now);
assert.strictEqual(memory.get('restore').seen[other].cwd, proj + '2'); // carried over, never resumed here

// No notes yet (first run): nothing to resume.
memory.clear(); sent.length = 0;
ext.activate(context);
assert.deepStrictEqual(sent, []);
tick();
assert.deepStrictEqual(Object.keys(memory.get('restore').seen), [live]);

fs.rmSync(home, { recursive: true, force: true });
console.log('ok');

// Run: node vscode-extension/check.js  (stubs vscode, uses a throwaway home)
const assert = require('assert'), fs = require('fs'), os = require('os'), path = require('path'), Module = require('module');
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'resume-check-'));
process.env.USERPROFILE = process.env.HOME = home;
const write = (dir, name, obj) => {
  fs.mkdirSync(path.join(home, '.claude', dir), { recursive: true });
  fs.writeFileSync(path.join(home, '.claude', dir, name), JSON.stringify(obj));
};
const proj = path.join(home, 'Proj');
write('open-sessions', 'dead.json', { id: 'dead', cwd: proj });
write('open-sessions', 'sub.json', { id: 'sub', cwd: path.join(proj, 'works') });
write('open-sessions', 'live.json', { id: 'live', cwd: proj });
write('open-sessions', 'other.json', { id: 'other', cwd: proj + '2' }); // sibling prefix must not match
write('sessions', '1.json', { pid: process.pid, sessionId: 'live' });
write('sessions', '2.json', { pid: 999999, sessionId: 'dead' }); // stale registry entry
fs.writeFileSync(path.join(home, '.claude', 'open-sessions', 'bad.json'), '{oops');

const transcript = (id, ...recs) => {
  const dir = path.join(home, '.claude', 'projects', 'parent-folder');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${id}.jsonl`), recs.map(r => JSON.stringify(r)).join('\n'));
};
transcript('dead', { type: 'custom-title', customTitle: 'my "name"' }, { type: 'ai-title', aiTitle: 'auto' });
transcript('sub', { type: 'ai-title', aiTitle: 'old' }, { type: 'user', text: '"aiTitle":"quoted in chat"' }, { type: 'ai-title', aiTitle: 'new' });
write('open-sessions', 'untitled-session.json', { id: 'untitled-session', cwd: proj });

const sent = [];
const folder = process.platform === 'win32' ? proj.toUpperCase() : proj; // Windows paths are case-insensitive
const vscode = {
  workspace: { workspaceFolders: [{ uri: { fsPath: folder } }] },
  window: { createTerminal: o => ({ sendText: t => sent.push([o.cwd, t, o.name]) }) },
};
const load = Module._load;
Module._load = (r, ...a) => r === 'vscode' ? vscode : load(r, ...a);
require('./extension.js').activate();
assert.deepStrictEqual(sent.map(s => s[1]).sort(), ['claude --resume dead', 'claude --resume sub', 'claude --resume untitled-session']);
assert.strictEqual(sent.find(s => s[1].endsWith('sub'))[0], path.join(proj, 'works'));
assert.deepStrictEqual(sent.map(s => s[2]).sort(), ['claude untitled', 'my "name"', 'new']);
fs.rmSync(home, { recursive: true, force: true });
console.log('ok');

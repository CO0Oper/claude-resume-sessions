"""Keeps ~/.claude/open-sessions/<id>.json = CLI sessions open in VS Code terminals.

Read by the claude-resume-sessions VS Code extension, which only restores sessions listed here.
A session stays listed when its terminal dies (SessionEnd reason "other" or no hook at
all), and is dropped when it ends on purpose (/exit, /clear, /resume, logout).
"""
import json, os, pathlib, re, sys

e = json.load(sys.stdin)
if os.environ.get("TERM_PROGRAM") != "vscode" or os.environ.get("CLAUDE_CODE_ENTRYPOINT") != "cli":
    sys.exit()  # skips `claude -p`, the desktop app and non-VS Code terminals
if not re.fullmatch("[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}", str(e.get("session_id")), re.I):
    sys.exit()  # the id becomes a filename, so it must not contain a path

d = pathlib.Path.home() / ".claude" / "open-sessions"
f = d / f"{e['session_id']}.json"
if e["hook_event_name"] == "SessionStart":
    d.mkdir(parents=True, exist_ok=True)
    f.write_text(json.dumps({"id": e["session_id"], "cwd": e["cwd"]}))
elif e.get("reason") != "other":
    f.unlink(missing_ok=True)

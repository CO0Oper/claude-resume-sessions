"""Keeps ~/.claude/open-sessions/<id>.json = CLI sessions open in VS Code terminals.

Read by the claude-resume-sessions VS Code extension, which resumes them on window open.
A session stays listed when its terminal dies (SessionEnd reason "other" or no hook at
all), and is dropped when it ends on purpose (/exit, /clear, /resume, logout).
"""
import json, os, pathlib, sys

e = json.load(sys.stdin)
if os.environ.get("TERM_PROGRAM") != "vscode" or os.environ.get("CLAUDE_CODE_ENTRYPOINT") != "cli":
    sys.exit()  # skips `claude -p`, the desktop app and non-VS Code terminals

d = pathlib.Path.home() / ".claude" / "open-sessions"
f = d / f"{e['session_id']}.json"
if e["hook_event_name"] == "SessionStart":
    d.mkdir(parents=True, exist_ok=True)
    f.write_text(json.dumps({"id": e["session_id"], "cwd": e["cwd"]}))
elif e.get("reason") != "other":
    f.unlink(missing_ok=True)

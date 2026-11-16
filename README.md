# claude-resume-sessions

Close VS Code, open it again, and your Claude Code sessions come back. Each project window reopens its own sessions, each in its own terminal tab.

This is for the Claude Code CLI running in VS Code's integrated terminal, not the Claude Code chat panel in VS Code.

## Install

Requires Python 3 and the `code` command on your PATH.

In Claude Code:

```
/plugin marketplace add CO0Oper/claude-resume-sessions
/plugin install resume-sessions@claude-resume-sessions
/resume-sessions:setup
```

Sessions running from then on are tracked.

## How it works

- A small VS Code extension notes once a minute which CLI sessions are running in each window's folder, using Claude Code's own list of running sessions (`~/.claude/sessions/`).
- When the window opens again, it resumes the sessions that were running when it closed, skipping any still running.

## Usage notes

- Quit with File > Exit so VS Code reopens all your windows. A window closed on its own comes back when you next open that folder.
- Resumed tabs are named after the session's title. Use `/rename` in a session to choose your own.
- Closed sessions stay closed. One closed in the last two minutes before VS Code closed can still come back.
- A session that was mid-task comes back with its conversation but doesn't continue by itself.
- Opening a folder restores sessions started in it or its subfolders.

## Limitations

- Tested on Windows only.
- `~/.claude/sessions/` is an internal Claude Code file format and may change. If it does, sessions stop being noted.
- A CLI session in the window's folder but outside VS Code (another terminal app) is noted too.
- After a reboot, a session can be skipped if an unrelated process has its old process ID. Reload the window to bring it back.
- Sessions resume with default flags, so options like `--model` from the original launch aren't reapplied.
- A custom `CLAUDE_CONFIG_DIR` isn't supported.

## Uninstall

```
/plugin uninstall resume-sessions@claude-resume-sessions
code --uninstall-extension local.claude-resume-sessions
```

## Test

```
node vscode-extension/check.js
```

## License

MIT

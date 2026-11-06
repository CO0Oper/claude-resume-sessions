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

Sessions started after setup are tracked.

## How it works

- A `SessionStart` hook records each CLI session started in a VS Code terminal in `~/.claude/open-sessions/`.
- A `SessionEnd` hook removes it when you end it on purpose (`/exit`, `/clear`, `/resume`, logout). A session whose terminal dies stays listed.
- A small VS Code extension runs on window open and resumes the listed sessions for that folder, skipping any still running.

## Usage notes

- Quit with File > Exit so VS Code reopens all your windows. A window closed on its own comes back when you next open that folder.
- Resumed tabs are named after the session's title. Use `/rename` in a session to choose your own.
- End a session for good with `/exit`. Closing its terminal tab leaves it listed, so it comes back.
- A session that was mid-task comes back with its conversation but doesn't continue by itself.
- Opening a folder restores sessions started in it or its subfolders.

## Limitations

- Tested on Windows only.
- Skipping running sessions reads `~/.claude/sessions/`, which is an internal Claude Code file format and may change. If it does, reloading a window could open duplicates.
- After a reboot, a session can be skipped if an unrelated process has its old process ID. Reload the window to bring it back.
- Sessions resume with default flags, so options like `--model` from the original launch aren't reapplied.
- A custom `CLAUDE_CONFIG_DIR` isn't supported.

## Uninstall

```
/plugin uninstall resume-sessions@claude-resume-sessions
code --uninstall-extension local.claude-resume-sessions
```

Then delete `~/.claude/open-sessions/`.

## Test

```
node vscode-extension/check.js
```

## License

MIT

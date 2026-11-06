---
name: setup
description: Install the VS Code extension that reopens Claude Code sessions. Use after installing the resume-sessions plugin, or when the user asks to set up session restore in VS Code.
---

Run this, trying `python3` first and `python` if that is not found:

```
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/install_extension.py"
```

Then ask whether the user wants `"terminal.integrated.persistentSessionReviveProcess": "never"` added to their VS Code user settings. Explain that without it, VS Code also restores an empty terminal beside each resumed session, and that with it, ordinary terminals no longer come back after a full close. Change the setting only if they agree.

Tell the user that only sessions started after this setup are tracked.

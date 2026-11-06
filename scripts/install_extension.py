"""Packs vscode-extension/ into a VSIX and installs it with the `code` CLI."""
import json, os, pathlib, shutil, subprocess, sys, tempfile, zipfile

SRC = pathlib.Path(__file__).resolve().parent.parent / "vscode-extension"

TYPES = """<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension=".json" ContentType="application/json"/><Default Extension=".js" ContentType="application/javascript"/><Default Extension=".vsixmanifest" ContentType="text/xml"/></Types>"""


def manifest(p):
    return f"""<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011">
<Metadata><Identity Language="en-US" Id="{p['name']}" Version="{p['version']}" Publisher="{p['publisher']}"/><DisplayName>{p['displayName']}</DisplayName><Description xml:space="preserve">{p['description']}</Description></Metadata>
<Installation><InstallationTarget Id="Microsoft.VisualStudio.Code"/></Installation><Dependencies/>
<Assets><Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true"/></Assets>
</PackageManifest>"""


def build(out):
    pkg = json.loads((SRC / "package.json").read_text(encoding="utf8"))
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("extension.vsixmanifest", manifest(pkg))
        z.writestr("[Content_Types].xml", TYPES)
        for name in ("package.json", "extension.js"):
            z.write(SRC / name, f"extension/{name}")


def main():
    os.chdir(SRC)  # on Windows, which() checks the current folder first, which could hold a planted code.cmd
    code = shutil.which("code")
    if not code:
        sys.exit("`code` is not on PATH. In VS Code run: Shell Command: Install 'code' command in PATH")
    with tempfile.TemporaryDirectory() as d:
        vsix = pathlib.Path(d) / "claude-resume-sessions.vsix"
        build(vsix)
        subprocess.run([code, "--install-extension", str(vsix), "--force"], check=True)


if __name__ == "__main__":
    main()

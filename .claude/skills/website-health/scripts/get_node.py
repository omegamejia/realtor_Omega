#!/usr/bin/env python3
"""
Put a private copy of Node.js in the person's home folder, only if none is usable.

    python3 get_node.py        -> prints the path to a working `node`, or exits 1

Node is only here so Google Lighthouse can run on this computer, in Chrome,
instead of through Google's free web service, which turns away anonymous
requests when many people use it at once (measured: HTTP 429).

No admin rights, no password, no installer: the official build from
nodejs.org is checked against nodejs.org's published SHA-256 list, then unpacked
into ~/.website-health/node. Nothing outside that folder is touched. Deleting
the folder undoes it completely. A Node already on this computer (or the one the
Summit preview installed) is used instead when it works.

Ported from summit-ai-preview/scripts/get_node.py; the checksum check is new.
"""
from __future__ import annotations

import hashlib
import json
import os
import platform
import shutil
import subprocess
import sys
import tarfile
import tempfile
import zipfile
from pathlib import Path
from urllib.request import Request, urlopen

HOME_DIR = Path.home() / ".website-health" / "node"
SUMMIT_DIR = Path.home() / ".ai-preview" / "node"  # where the Summit VIP portal installs Node
MIN_MAJOR = 18


def works(node: str) -> bool:
    """node runs, is new enough, and has npx beside it (Lighthouse is fetched with npx)."""
    bindir = os.path.dirname(node)
    if not os.path.exists(os.path.join(bindir, "npx.cmd" if os.name == "nt" else "npx")):
        return False
    try:
        out = subprocess.run([node, "--version"], capture_output=True, text=True, timeout=20).stdout.strip()
        return out.startswith("v") and int(out[1:].split(".")[0]) >= MIN_MAJOR
    except Exception:
        return False


def existing():
    # Same order as grader.find_node(): our private copy, Summit's, then whatever is on PATH.
    # WEBSITE_HEALTH_FRESH_NODE=1 (the CI test) ignores every Node but ours, so the
    # download a bare machine depends on is exercised on every operating system.
    fresh = os.environ.get("WEBSITE_HEALTH_FRESH_NODE")
    cands = [str(HOME_DIR / "bin" / "node"), str(HOME_DIR / "node.exe")]
    if not fresh:
        cands += [str(SUMMIT_DIR / "bin" / "node"), str(SUMMIT_DIR / "node.exe"), shutil.which("node")]
    for cand in cands:
        if cand and Path(cand).exists() and works(cand):
            return cand
    return None


def target():
    system = platform.system()
    machine = platform.machine().lower()
    arch = "arm64" if machine in ("arm64", "aarch64") else "x64"
    if system == "Darwin":
        return "darwin-" + arch, ".tar.gz"
    if system == "Windows":
        return "win-" + arch, ".zip"
    return "linux-" + arch, ".tar.gz"


def warm_lighthouse(node):
    """Download Google's Lighthouse once, now, so the first check of a site does not spend its
    time limit waiting for npm (measured on Windows: the first check timed out doing exactly that)."""
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    try:
        from grader import LIGHTHOUSE, _npx_cli
    except Exception:
        return
    cli = _npx_cli(node)
    launcher = [node, cli] if cli else [os.path.join(os.path.dirname(node), "npx.cmd" if os.name == "nt" else "npx")]
    env = dict(os.environ, PATH=os.path.dirname(node) + os.pathsep + os.environ.get("PATH", ""))
    try:
        subprocess.run(launcher + ["--yes", LIGHTHOUSE, "--version"], env=env, stdout=subprocess.DEVNULL,
                       stderr=subprocess.DEVNULL, timeout=600)
    except Exception:
        pass


def main() -> int:
    found = existing()
    if found:
        if "--warm" in sys.argv:
            warm_lighthouse(found)
        print(found)
        return 0

    plat, ext = target()
    with urlopen(Request("https://nodejs.org/dist/index.json", headers={"User-Agent": "website-health"}), timeout=30) as r:
        releases = json.loads(r.read().decode())
    version = next(x["version"] for x in releases if x.get("lts"))
    name = "node-%s-%s" % (version, plat)
    url = "https://nodejs.org/dist/%s/%s%s" % (version, name, ext)
    print("Downloading %s ..." % url, file=sys.stderr, flush=True)

    tmp = Path(tempfile.mkdtemp())
    archive = tmp / (name + ext)
    with urlopen(Request(url, headers={"User-Agent": "website-health"}), timeout=300) as r, open(archive, "wb") as f:
        shutil.copyfileobj(r, f)

    # Only unpack what nodejs.org says it published.
    sums_url = "https://nodejs.org/dist/%s/SHASUMS256.txt" % version
    with urlopen(Request(sums_url, headers={"User-Agent": "website-health"}), timeout=30) as r:
        sums = r.read().decode("utf-8", "replace")
    want = next((l.split()[0] for l in sums.splitlines() if l.strip().endswith("  " + name + ext)), None)
    h = hashlib.sha256()
    with open(archive, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    if not want or h.hexdigest() != want:
        shutil.rmtree(tmp, ignore_errors=True)
        print("The Node download did not match nodejs.org's checksum; not installed.", file=sys.stderr)
        return 1

    if ext == ".zip":
        with zipfile.ZipFile(archive) as z:
            z.extractall(tmp)
    else:
        with tarfile.open(archive) as t:
            if hasattr(tarfile, "data_filter"):  # Python 3.12+: refuse paths that escape tmp
                t.extractall(tmp, filter="data")
            else:
                t.extractall(tmp)

    if HOME_DIR.exists():
        shutil.rmtree(HOME_DIR)
    HOME_DIR.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(tmp / name), str(HOME_DIR))
    shutil.rmtree(tmp, ignore_errors=True)

    node = str(HOME_DIR / ("node.exe" if ext == ".zip" else "bin/node"))
    if not works(node):
        print("Node was unpacked but does not run.", file=sys.stderr)
        return 1
    if "--warm" in sys.argv:
        warm_lighthouse(node)
    print(node)
    return 0


if __name__ == "__main__":
    sys.exit(main())

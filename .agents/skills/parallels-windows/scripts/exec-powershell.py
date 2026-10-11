#!/usr/bin/env python3
"""Run a UTF-8 PowerShell file in the logged-in Parallels Windows session."""

import argparse
import base64
from pathlib import Path
import subprocess
import sys


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--vm", required=True, help="VM ID or name discovered with prlctl list")
    parser.add_argument("--file", type=Path, required=True, help="Host-side UTF-8 PowerShell file")
    parser.add_argument("--timeout", type=int, default=60, help="Host wait limit in seconds")
    args = parser.parse_args()
    if args.timeout <= 0:
        parser.error("--timeout must be positive")
    try:
        source = args.file.read_text(encoding="utf-8-sig")
    except (OSError, UnicodeError) as error:
        parser.error(str(error))
    if not source.strip():
        parser.error("PowerShell file is empty")
    script = "$ErrorActionPreference = 'Stop'\n[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)\ntry {\n" + source + "\n} catch { [Console]::Error.WriteLine($_.ToString()); exit 1 }\n"
    encoded = base64.b64encode(script.encode("utf-16-le")).decode("ascii")
    try:
        result = subprocess.run(
            ["prlctl", "exec", args.vm, "--current-user", "powershell.exe",
             "-NoLogo", "-NoProfile", "-NonInteractive", "-EncodedCommand", encoded],
            timeout=args.timeout,
        )
    except FileNotFoundError:
        print("prlctl is not available on PATH", file=sys.stderr)
        return 127
    except subprocess.TimeoutExpired:
        print("Host wait timed out; check VM state and guest processes before retrying.", file=sys.stderr)
        return 124
    return result.returncode if result.returncode >= 0 else 128 - result.returncode


if __name__ == "__main__":
    sys.exit(main())

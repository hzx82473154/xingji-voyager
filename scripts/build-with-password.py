#!/usr/bin/env python3
"""Keep a build password out of command arguments, files and shell history."""
import getpass
import json
import pathlib
import subprocess
import sys

root = pathlib.Path(__file__).resolve().parent.parent
password = getpass.getpass('Voyager access password (6–256 characters): ')
if not 6 <= len(password) <= 256:
    sys.exit('Use a password between 6 and 256 characters. No files were replaced.')
request = json.dumps({'password': password}, ensure_ascii=False) + '\n'
for command in [['node', 'build.mjs'], ['node', 'validation/protected-v23.test.mjs'], ['node', 'validation/production-startup.test.mjs']]:
    result = subprocess.run(command, cwd=root, input=request, text=True)
    if result.returncode:
        sys.exit(result.returncode)
password = request = ''

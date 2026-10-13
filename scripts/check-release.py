#!/usr/bin/env python3
"""Audit distributable source, recursively inspecting compressed/embedded text.

Optional sensitive strings enter on stdin; matches are never printed verbatim.
This checks known patterns and package integrity, not every possible secret.
"""
import argparse
import base64
import gzip
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import re
import sys
import zipfile

GENERATED = {'node_modules', 'dist', '.git', '.sites-runtime', '__pycache__'}
GENERATED_FILES = {'index.html', 'mobile.html'}
GENERATED_REPORTS = re.compile(r'^validation/(?:platform-content\.json|protected-build\.json|v[\d.]+-(?:production-startup|protected|rights|static)-results\.json)$')
RETIRED = {'lutetia-shape.json', 'steins-shape.json', 'arrokoth-shape.json'}
RULES = {
    'private-key': rb'-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----',
    'github-token': rb'\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b',
    'service-token': rb'\b(?:sk-[A-Za-z0-9_-]{20,}|AKIA[A-Z0-9]{16}|AIza[A-Za-z0-9_-]{30,}|xox[baprs]-[A-Za-z0-9-]{12,})\b',
    'credential-url': rb'(?i)https?://[^\s/<>"\x27]+:[^\s/@<>"\x27]+@',
    'signed-url': rb'(?i)[?&](?:X-Amz-Signature|sig|X-Goog-Signature)=[a-fA-F0-9%]{12,}',
    'credential-literal': rb'(?i)(?:password|passwd|api[_-]?key|access[_-]?token|client[_-]?secret|authorization)\s*[=:]\s*["\x27]([^"\x27\r\n]{3,})["\x27]',
    'private-workspace-path': rb'/workspace/(?:scratch|sites)/',
}
COMPILED = {k: re.compile(v) for k, v in RULES.items()}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def private_path(name):
    parts = PurePosixPath(name).parts
    return any(p.startswith('.env') or p in {'.openai', '.npmrc', '.netrc', '.ssh', '.aws', '.sites-runtime'} for p in parts) or PurePosixPath(name).suffix.lower() in {'.pem', '.key', '.p12', '.pfx'}


def audit(root, archive=None, sensitive=None):
    issues, files, expanded, skipped = [], {}, {}, []
    extras = []
    for value in sensitive or []:
        raw = value.encode()
        extras.extend([raw, base64.b64encode(raw), ''.join('\\u%04x' % ord(c) for c in value).encode()])

    def inspect(name, data, depth=0):
        expanded[name] = len(data)
        for rule, pattern in COMPILED.items():
            matches = list(pattern.finditer(data))
            if matches:
                issues.append({'path': name, 'rule': rule, 'count': len(matches), 'lines': [data.count(b'\n', 0, m.start()) + 1 for m in matches[:8]]})
        if any(v and v in data for v in extras):
            issues.append({'path': name, 'rule': 'provided-sensitive-value', 'count': 1})
        if depth >= 4:
            return
        if data.startswith(b'\x1f\x8b'):
            try:
                inspect(name + '::gunzip', gzip.decompress(data), depth + 1)
            except (OSError, EOFError):
                issues.append({'path': name, 'rule': 'invalid-gzip'})
        if data.startswith(b'PK\x03\x04'):
            try:
                with zipfile.ZipFile(io.BytesIO(data)) as z:
                    for entry in z.infolist():
                        p = PurePosixPath(entry.filename)
                        if p.is_absolute() or '..' in p.parts or ((entry.external_attr >> 16) & 0o170000) == 0o120000:
                            issues.append({'path': name, 'rule': 'unsafe-archive-path'})
                        elif not entry.is_dir():
                            inspect(name + '::' + entry.filename, z.read(entry), depth + 1)
            except (OSError, zipfile.BadZipFile):
                issues.append({'path': name, 'rule': 'invalid-zip'})
        # Gzip JSON and embedded font/image data in the current runtime HTML.
        for i, m in enumerate(re.finditer(rb'(?:["\x27](H4sI[A-Za-z0-9+/=]{32,})["\x27]|base64,([A-Za-z0-9+/=]{32,}))', data)):
            try:
                payload = base64.b64decode(m.group(1) or m.group(2), validate=True)
                inspect(name + '::base64-' + str(i), payload, depth + 1)
            except (ValueError, base64.binascii.Error):
                issues.append({'path': name, 'rule': 'invalid-embedded-base64'})

    if archive:
        with zipfile.ZipFile(archive) as z:
            bad = z.testzip()
            if bad:
                issues.append({'path': bad, 'rule': 'zip-crc'})
            for entry in z.infolist():
                p = PurePosixPath(entry.filename)
                if p.is_absolute() or '..' in p.parts or ((entry.external_attr >> 16) & 0o170000) == 0o120000:
                    issues.append({'path': entry.filename, 'rule': 'unsafe-archive-path'})
                    continue
                if not entry.is_dir():
                    name = '/'.join(p.parts[1:]) if p.parts[0] == 'Voyager-source' else str(p)
                    if name in files:
                        issues.append({'path': name, 'rule': 'duplicate-archive-path'})
                    files[name] = z.read(entry)
    else:
        for path in sorted(root.rglob('*')):
            relative = path.relative_to(root)
            if any(p in GENERATED for p in relative.parts) or str(relative) in GENERATED_FILES or GENERATED_REPORTS.match(relative.as_posix()) or relative.suffix == '.pyc':
                if path.is_file():
                    skipped.append(str(relative))
                continue
            if path.is_symlink():
                issues.append({'path': str(relative), 'rule': 'symlink'})
            elif path.is_file():
                files[relative.as_posix()] = path.read_bytes()

    for name, data in files.items():
        p = PurePosixPath(name)
        if private_path(name) or any(x in GENERATED for x in p.parts) or str(p) in GENERATED_FILES:
            issues.append({'path': name, 'rule': 'private-or-generated-file'})
        if p.name in RETIRED or p.suffix.lower() in {'.tar', '.tgz', '.bak', '.log'} or name.endswith('.tar.gz'):
            issues.append({'path': name, 'rule': 'retired-or-unexpected-history-file'})
        inspect(name, data)

    manifest = json.loads(files.get('source-sha256.json', b'{}'))
    if not manifest:
        issues.append({'path': 'source-sha256.json', 'rule': 'missing-source-manifest'})
    for name, expected in manifest.items():
        if name not in files or sha(files[name]) != expected:
            issues.append({'path': name, 'rule': 'source-hash-mismatch'})
    for name in files.keys() - manifest.keys() - {'source-sha256.json'}:
        issues.append({'path': name, 'rule': 'unregistered-source-file'})

    config = json.loads(files.get('config.json', b'{}'))
    if set(config) != {'githubUrl', 'onlineUrl', 'title', 'maxPixelRatio', 'epochUTC'}:
        issues.append({'path': 'config.json', 'rule': 'unreviewed-config-key'})
    for name in ['LICENSE', 'NOTICE', 'LICENSING.md', 'THIRD_PARTY_LICENSES.md', 'assets/FONT_LICENSE.txt', 'assets/landmarks/LICENSES.md', 'catalogs/LICENSES.md']:
        if name not in files:
            issues.append({'path': name, 'rule': 'missing-licence-document'})
    largest = sorted(({'path': k, 'bytes': len(v)} for k, v in files.items()), key=lambda x: x['bytes'], reverse=True)[:3]
    for entry in largest:
        if entry['bytes'] > 100 * 1048576:
            issues.append({'path': entry['path'], 'rule': 'github-single-file-limit'})
    return {'passed': not issues, 'files': len(files), 'manifestEntries': len(manifest), 'expandedStreams': len(expanded), 'providedSensitiveValueCount': len(sensitive or []), 'excludedGeneratedFiles': len(skipped), 'largestFiles': largest, 'findings': issues, 'scope': 'Current distributable source and recursively expanded gzip/base64/archive streams; pattern-based check, not a server security assessment. Third-party asset audit was not repeated.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parent.parent)
    parser.add_argument('--archive', type=Path)
    parser.add_argument('--sensitive-stdin', action='store_true', help='read {"values":[...]} on stdin; do not put credentials in arguments')
    parser.add_argument('--report', type=Path, help='optional redacted report path, preferably outside distributable source')
    args = parser.parse_args()
    values = json.load(sys.stdin).get('values', []) if args.sensitive_stdin else []
    result = audit(args.root, args.archive, values)
    output = json.dumps(result, ensure_ascii=False, indent=2) + '\n'
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(output)
    print(output, end='')
    return 0 if result['passed'] else 1


if __name__ == '__main__':
    raise SystemExit(main())

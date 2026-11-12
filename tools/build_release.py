#!/usr/bin/env python3
"""Build a Store release package without distributing the proprietary BMW SDK."""
import json
import shutil
import subprocess
import tarfile
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SPEC = json.loads((ROOT / 'apps/getproger_eq_config/app.json').read_text())
APP_ID = SPEC['id']
VERSION = SPEC['version']


def main():
    out = ROOT / 'dist'
    out.mkdir(exist_ok=True)
    result = out / (APP_ID + '@' + VERSION + '.tgz')
    with tempfile.TemporaryDirectory(prefix='eq-config-release-') as tmp:
        tree = Path(tmp)
        shutil.copytree(ROOT / 'kit', tree / 'kit', ignore=shutil.ignore_patterns('__pycache__', '*.pyc'))
        shutil.copytree(ROOT / 'apps', tree / 'apps')
        # build.py copies the SDK but does not execute it. This disposable stub is
        # removed from the artifact; Store generates the SDK from a BMW donor.
        sdk = tree / 'oap-sdk'
        sdk.mkdir()
        (sdk / 'index.js').write_text('module.exports = {};\n')
        (sdk / 'package.json').write_text('{"name":"oap-sdk","version":"0.0.0"}\n')
        subprocess.run(['python3', str(tree / 'kit/tools/build.py'), APP_ID], cwd=str(tree), check=True)
        package = tree / 'dist' / APP_ID / 'source'
        shutil.rmtree(package / 'node_modules' / 'oap-sdk')
        (package / 'node_modules').rmdir()
        metadata = json.loads((package / 'package.json').read_text())
        metadata['mguHmi'] = ['ID7']
        (package / 'package.json').write_text(json.dumps(metadata, indent=2) + '\n')
        with tarfile.open(result, 'w:gz') as archive:
            archive.add(package, arcname='package')
        with tarfile.open(result, 'r:gz') as archive:
            names = archive.getnames()
            if any('/node_modules/oap-sdk' in name for name in names):
                raise RuntimeError('SDK unexpectedly present in release')
            if 'package/javascript/app.js' not in names or 'package/rhmiData/application.json' not in names:
                raise RuntimeError('Incomplete OAP package')
    print('Release package:', result)


if __name__ == '__main__':
    main()

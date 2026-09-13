#!/usr/bin/env python3
"""Build a self-contained macOS game. Uses only Python stdlib and Apple tools."""
from pathlib import Path
import json
import plistlib
import shutil
import subprocess
import struct
import sys
from tools.release_files import copy_runtime
from tools.prepare_assets import prepare_assets

ROOT = Path(__file__).resolve().parent
PROJECT = json.loads((ROOT / 'project.json').read_text(encoding='utf-8'))
APP = ROOT / 'dist' / (PROJECT['name'] + '.app')

def run(*args):
    subprocess.run([str(a) for a in args], check=True, cwd=ROOT)

def main():
    game = ROOT / 'game'
    prepare_assets(ROOT)
    if sys.platform != 'darwin' or '--web-only' in sys.argv:
        print('Browser version prepared: game/index.html')
        return
    contents = APP / 'Contents'
    binary = contents / 'MacOS/Gurov'
    resources = contents / 'Resources'
    binary.parent.mkdir(parents=True, exist_ok=True)
    resources.mkdir(parents=True, exist_ok=True)
    # Recreate only generated bundle resources; only runtime files are included in the app.
    if (resources / 'game').exists(): shutil.rmtree(resources / 'game')
    copy_runtime(game, resources / 'game')
    with (contents / 'Info.plist').open('wb') as f:
        plistlib.dump({
            'CFBundleName': 'Гуров', 'CFBundleDisplayName': PROJECT['name'],
            'CFBundleIdentifier': PROJECT['bundleId'], 'CFBundleExecutable': 'Gurov',
            'CFBundlePackageType': 'APPL', 'CFBundleShortVersionString': PROJECT['version'],
            'CFBundleVersion': PROJECT['build'], 'LSMinimumSystemVersion': '12.0',
            'CFBundleIconFile': 'AppIcon',
            'NSHighResolutionCapable': True, 'NSPrincipalClass': 'NSApplication',
            'NSHumanReadableCopyright': 'Original fictional fan game. Reference portrait: CMC MSU, CC BY 4.0.'
        }, f)
    cache = ROOT / '.build/swift-cache'
    cache.mkdir(parents=True, exist_ok=True)
    icon = ROOT / '.build/Icon.png'
    if not icon.exists():
        run('/usr/bin/swiftc', '-module-cache-path', cache, ROOT / 'native/Icon.swift', '-o', ROOT / '.build/icon-maker')
        run(ROOT / '.build/icon-maker', icon)
    iconset = ROOT / '.build/AppIcon.iconset'
    iconset.mkdir(exist_ok=True)
    for size in [16, 32, 128, 256, 512]:
        for factor in [1, 2]:
            name = 'icon_{}x{}{}.png'.format(size, size, '@2x' if factor == 2 else '')
            subprocess.run(['/usr/bin/sips', '-z', str(size * factor), str(size * factor), str(icon), '--out', str(iconset / name)], check=True, stdout=subprocess.DEVNULL)
    # PNG-backed ICNS avoids relying on the iconutil service in restricted shells.
    chunks = []
    for code, name in [('icp4','icon_16x16.png'), ('icp5','icon_32x32.png'), ('ic07','icon_128x128.png'), ('ic08','icon_256x256.png'), ('ic09','icon_512x512.png'), ('ic10','icon_512x512@2x.png')]:
        data = (iconset / name).read_bytes()
        chunks.append(code.encode() + struct.pack('>I', len(data) + 8) + data)
    payload = b''.join(chunks)
    (resources / 'AppIcon.icns').write_bytes(b'icns' + struct.pack('>I', len(payload) + 8) + payload)
    slices = []
    for arch in ['arm64', 'x86_64']:
        part = ROOT / ('.build/Gurov-' + arch)
        run('/usr/bin/swiftc', '-O', '-module-cache-path', cache, '-target', arch + '-apple-macos12.0',
            '-framework', 'Cocoa', '-framework', 'WebKit', ROOT / 'native/App.swift', '-o', part)
        slices.append(part)
    run('/usr/bin/lipo', '-create', *slices, '-output', binary)
    run('/usr/bin/codesign', '--force', '--sign', '-', APP)
    print('Ready:', APP)

if __name__ == '__main__':
    main()

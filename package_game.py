#!/usr/bin/env python3
"""Package offline releases. Python stdlib only; no implicit downloads."""
from pathlib import Path
import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import zipfile
from tools.release_files import copy_runtime

ROOT = Path(__file__).resolve().parent
PROJECT = json.loads((ROOT / 'project.json').read_text(encoding='utf-8'))
VERSION = PROJECT['version']
ELECTRON = PROJECT['electron']
RELEASES = ROOT / 'dist/releases'


def fresh(name):
    target = ROOT / '.build/packages' / name
    if target.exists():
        shutil.rmtree(target)
    target.mkdir(parents=True)
    return target


def add_docs(folder, instructions):
    playing = (ROOT / 'docs/PLAYING.md').read_text(encoding='utf-8')
    (folder / 'READ-ME.txt').write_text(instructions + '\n\n' + playing, encoding='utf-8')
    shutil.copy2(ROOT / 'docs/ASSETS.md', folder / 'SOURCES.txt')
    shutil.copy2(ROOT / 'docs/VOICE-CAST.md', folder / 'VOICE-CAST.md')


def zip_folder(folder):
    archive = RELEASES / (folder.name + '.zip')
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for file in sorted(folder.rglob('*')):
            if file.is_file():
                z.write(file, folder.name + '/' + file.relative_to(folder).as_posix())
    return archive


def browser_package():
    folder = fresh(f'Gurov-{VERSION}-browser')
    copy_runtime(ROOT / 'game', folder)
    add_docs(folder, 'ЗАПУСК В БРАУЗЕРЕ\nПолностью распакуйте архив и откройте index.html.\n'
             'Сохраняйте файлы вместе. Python, Node.js и сервер для игры не нужны.')
    return zip_folder(folder)


def verify_electron(runtime):
    if not runtime.is_file():
        filename = f"electron-v{ELECTRON['version']}-{ELECTRON['platform']}.zip"
        raise SystemExit('Download the pinned official runtime, then pass --electron-runtime PATH:\n'
                         f"https://github.com/electron/electron/releases/download/v{ELECTRON['version']}/{filename}")
    if hashlib.sha256(runtime.read_bytes()).hexdigest() != ELECTRON['sha256']:
        raise SystemExit('Electron runtime SHA-256 mismatch; no archive was extracted.')


def windows_package(runtime):
    folder = fresh(f'Gurov-{VERSION}-Windows-x64')
    with zipfile.ZipFile(runtime) as z:
        for entry in z.infolist():
            if not (folder / entry.filename).resolve().is_relative_to(folder.resolve()):
                raise ValueError('Unsafe archive entry')
        z.extractall(folder)
    (folder / 'electron.exe').rename(folder / 'Gurov.exe')
    (folder / 'resources/default_app.asar').unlink(missing_ok=True)
    app = folder / 'resources/app'
    app.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT / 'desktop/main.cjs', app / 'main.cjs')
    metadata = json.loads((ROOT / 'desktop/package.json').read_text(encoding='utf-8'))
    metadata.update(version=VERSION, productName=PROJECT['name'])
    (app / 'package.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    copy_runtime(ROOT / 'game', app / 'game')
    add_docs(folder, 'WINDOWS 10/11 · x64\nРаспакуйте весь архив и запустите Gurov.exe. F11 — полный экран.\n'
             'Пересылайте папку целиком. Дополнительный движок не нужен.\n'
             'Сборка не подписана сертификатом издателя; Windows может показать предупреждение.\n'
             'Не отключайте защиту системы. Запуск на Windows пока не проверен; проверены состав и PE x64.')
    return zip_folder(folder)


def mac_package():
    app = ROOT / 'dist' / (PROJECT['name'] + '.app')
    folder = fresh(f'Gurov-{VERSION}-macOS')
    shutil.copytree(app, folder / app.name)
    add_docs(folder, 'macOS 12+ · APPLE SILICON / INTEL\nРаспакуйте архив и откройте приложение. Ctrl+Cmd+F — полный экран.\n'
             'Проверен запуск на Apple Silicon. Intel-срез скомпилирован, но на Intel Mac не запускался.\n'
             'Приложение имеет ad-hoc подпись без нотариализации Apple. На другом Mac возможна\n'
             'проверка Gatekeeper. Не отключайте защиту системы; доступна также браузерная версия.')
    archive = RELEASES / (folder.name + '.zip')
    subprocess.run(['/usr/bin/ditto', '-c', '-k', '--sequesterRsrc', '--keepParent', str(folder), str(archive)], check=True)
    return archive


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--target', choices=['browser', 'macos', 'windows', 'all'], default='browser')
    parser.add_argument('--electron-runtime', type=Path, default=ROOT / '.build/electron' /
                        f"electron-v{ELECTRON['version']}-{ELECTRON['platform']}.zip")
    args = parser.parse_args()
    targets = ['browser', 'windows', 'macos'] if args.target == 'all' else [args.target]
    if 'macos' in targets and sys.platform != 'darwin':
        parser.error('macOS packages require macOS and Xcode Command Line Tools.')
    if 'windows' in targets:
        verify_electron(args.electron_runtime)
    subprocess.run([sys.executable, str(ROOT / 'build.py'), '--web-only'], check=True)
    RELEASES.mkdir(parents=True, exist_ok=True)
    archives = []
    for target in targets:
        if target == 'browser':
            archives.append(browser_package())
        elif target == 'windows':
            archives.append(windows_package(args.electron_runtime))
        else:
            subprocess.run([sys.executable, str(ROOT / 'build.py')], check=True)
            archives.append(mac_package())
    manifest = {'version': VERSION, 'offline': True, 'electronVersion': ELECTRON['version'],
                'electronRuntimeSHA256': ELECTRON['sha256'],
                'files': {p.name: {'bytes': p.stat().st_size, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()}
                          for p in archives}}
    output = RELEASES / f'manifest-{VERSION}.json'
    output.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    print('Ready:', output)
    for archive in archives:
        print(' ', archive.name)


if __name__ == '__main__':
    main()

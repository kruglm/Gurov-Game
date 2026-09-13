#!/bin/zsh
cd "${0:A:h}"
if [[ -d 'dist/Гуров — Последний удовл.app' ]]; then
  open 'dist/Гуров — Последний удовл.app'
else
  python3 build.py --web-only || exit 1
  open 'game/index.html'
fi

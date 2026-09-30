#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
[ -x .venv/bin/python ] || python3 -m venv .venv
.venv/bin/python -c "import pygame; assert pygame.version.ver == '2.5.8'" >/dev/null 2>&1 || .venv/bin/python -m pip install --disable-pip-version-check -r requirements.txt
exec .venv/bin/python main.py

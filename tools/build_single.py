#!/usr/bin/env python3
"""Inline the stylesheet and every script into one HTML file: dist/deepward-single.html (open it anywhere, no server)."""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent


def main():
    html = (ROOT / 'index.html').read_text(encoding='utf-8')

    def css(m):
        return '<style>\n' + (ROOT / m.group(1)).read_text(encoding='utf-8') + '\n</style>'

    def js(m):
        # Escape any closing script tag inside the code so it cannot end the inline block early
        code = (ROOT / m.group(1)).read_text(encoding='utf-8').replace('</script', '<\\/script')
        return '<script>\n' + code + '\n</script>'

    html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', css, html)
    html = re.sub(r'<script src="([^"]+)"></script>', js, html)
    out = ROOT / 'dist' / 'deepward-single.html'
    out.parent.mkdir(exist_ok=True)
    out.write_text(html, encoding='utf-8')
    print(f'wrote {out.relative_to(ROOT)} ({out.stat().st_size // 1024} KB)')


if __name__ == '__main__':
    main()

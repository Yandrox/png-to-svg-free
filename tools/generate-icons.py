#!/usr/bin/env python3
"""Generate the PWA PNG icons from the same geometry as icons/icon.svg.
Standard library only; run: python3 tools/generate-icons.py
"""
import math
import os
import struct
import zlib

BLUE = (47, 129, 247, 255)
WHITE = (255, 255, 255, 255)
GREEN = (63, 185, 80, 255)
SS = 3  # supersampling per axis


def chunk(kind, data):
    return (struct.pack('>I', len(data)) + kind + data +
            struct.pack('>I', zlib.crc32(kind + data) & 0xffffffff))


def write_png(path, size, pixels):
    raw = bytearray()
    for y in range(size):
        raw.append(0)  # filter: none
        raw.extend(pixels[y * size * 4:(y + 1) * size * 4])
    png = (b'\x89PNG\r\n\x1a\n' +
           chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)) +
           chunk(b'IDAT', zlib.compress(bytes(raw), 9)) +
           chunk(b'IEND', b''))
    with open(path, 'wb') as fh:
        fh.write(png)


def rounded_rect(u, v, x0, y0, x1, y1, r):
    if not (x0 <= u <= x1 and y0 <= v <= y1):
        return False
    cx = min(max(u, x0 + r), x1 - r)
    cy = min(max(v, y0 + r), y1 - r)
    return (u - cx) ** 2 + (v - cy) ** 2 <= r * r


def triangle(u, v, a, b, c):
    def sign(p1, p2, p3):
        return (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1])
    d1, d2, d3 = sign((u, v), a, b), sign((u, v), b, c), sign((u, v), c, a)
    has_neg = d1 < 0 or d2 < 0 or d3 < 0
    has_pos = d1 > 0 or d2 > 0 or d3 > 0
    return not (has_neg and has_pos)


def segment(u, v, a, b, width):
    dx, dy = b[0] - a[0], b[1] - a[1]
    length2 = dx * dx + dy * dy
    t = max(0, min(1, ((u - a[0]) * dx + (v - a[1]) * dy) / length2))
    px, py = a[0] + t * dx, a[1] + t * dy
    return (u - px) ** 2 + (v - py) ** 2 <= (width / 2) ** 2


def color_at(u, v):
    # chevron
    if (segment(u, v, (0.721, 0.62), (0.822, 0.721), 0.035) or
            segment(u, v, (0.822, 0.721), (0.721, 0.822), 0.035)):
        return GREEN
    # image frame
    outer = rounded_rect(u, v, 0.17, 0.17, 0.83, 0.83, 0.08)
    inner = rounded_rect(u, v, 0.215, 0.215, 0.785, 0.785, 0.055)
    if outer and not inner:
        return WHITE
    # sun and mountain
    if (u - 0.629) ** 2 + (v - 0.36) ** 2 <= 0.074 ** 2:
        return WHITE
    if triangle(u, v, (0.219, 0.721), (0.449, 0.42), (0.68, 0.721)):
        return WHITE
    return BLUE


def render(size):
    out = bytearray(size * size * 4)
    inv = 1 / (size * SS)
    for y in range(size):
        for x in range(size):
            acc = [0, 0, 0, 0]
            for sy in range(SS):
                for sx in range(SS):
                    c = color_at((x + (sx + 0.5) / SS) * inv,
                                 (y + (sy + 0.5) / SS) * inv)
                    for i in range(4):
                        acc[i] += c[i]
            p = (y * size + x) * 4
            for i in range(4):
                out[p + i] = round(acc[i] / (SS * SS))
    return out


def main():
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    folder = os.path.join(base, 'icons')
    os.makedirs(folder, exist_ok=True)
    for size in (192, 512):
        path = os.path.join(folder, 'icon-%d.png' % size)
        write_png(path, size, render(size))
        print('wrote', path, os.path.getsize(path), 'bytes')


if __name__ == '__main__':
    main()

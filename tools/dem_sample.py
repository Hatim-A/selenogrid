#!/usr/bin/env python3
"""Quick LOLA polar stereographic DEM sampler + PNG thumbnail generator.

Used to verify georeferencing/orientation before the C horizon extractor.
"""
import mmap
import struct
import sys
import zlib

R = 1737400.0  # mean lunar radius, m
PIX = 80.0
N = 7600
OFF = (N - 1) / 2.0   # LINE_PROJECTION_OFFSET

path = "/home/dev/Projects/selenogrid/data/lola/ldem_80s_80m.img"


class Dem:
    def __init__(self, path):
        self.f = open(path, "rb")
        self.mm = mmap.mmap(self.f.fileno(), 0, access=mmap.ACCESS_READ)

    def dn(self, row, col):
        if row < 0 or col < 0 or row >= N or col >= N:
            return -32768
        off = (row * N + col) * 2
        (v,) = struct.unpack_from("<h", self.mm, off)
        return v

    def elev(self, row, col):
        v = self.dn(row, col)
        if v == -32768:
            return None
        return v * 0.5

    def latlon_to_rc(self, lat, lon):
        # south polar stereographic, true at pole; 0E up, 90E right
        colat = (lat - (-90.0))  # degrees from pole
        r = 2.0 * R * __import__("math").tan(__import__("math").radians(colat) / 2.0)
        x = r * __import__("math").sin(__import__("math").radians(lon))
        y = r * __import__("math").cos(__import__("math").radians(lon))
        col = OFF + x / PIX
        row = OFF - y / PIX
        return row, col

    def sample(self, lat, lon, bilinear=True):
        row, col = self.latlon_to_rc(lat, lon)
        if not bilinear:
            return self.elev(int(round(row)), int(round(col)))
        r0, c0 = int(row), int(col)
        fr, fc = row - r0, col - c0
        vs = []
        for dr, dc, w in ((0, 0, (1 - fr) * (1 - fc)), (0, 1, (1 - fr) * fc),
                          (1, 0, fr * (1 - fc)), (1, 1, fr * fc)):
            v = self.elev(r0 + dr, c0 + dc)
            if v is None:
                return None
            vs.append((v, w))
        return sum(v * w for v, w in vs)


def png_gray(path, w, h, pixels):
    raw = bytearray()
    for y in range(h):
        raw.append(0)
        raw.extend(pixels[y * w:(y + 1) * w])

    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        c += struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        return c

    out = bytearray(b"\x89PNG\r\n\x1a\n")
    out += chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 0, 0, 0, 0))
    out += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    out += chunk(b"IEND", b"")
    open(path, "wb").write(out)


if __name__ == "__main__":
    dem = Dem(path)
    # Known-ish landmarks: name, lat, lon, expected elevation scale
    pts = [
        ("S pole (Shackleton area)", -90.0, 0.0),
        ("Shackleton center", -89.9, 0.0),
        ("Malapert massif 0E", -86.0, 0.0),
        ("de Gerlache rim", -88.5, -87.1),
        ("Connecting Ridge", -89.45, -137.4),
        ("Nobile rim", -85.4, 53.0),
        ("Amundsen rim", -84.5, 83.0),
        ("Cabeus", -85.3, -42.1),
    ]
    for name, lat, lon in pts:
        print(f"{name:28s} {lat:8.2f} {lon:9.2f} -> {dem.sample(lat, lon)} m")

    # Thumbnail: whole 80S-90S square, 900x900
    W = H = 900
    step = N / W
    px = bytearray(W * H)
    vals = []
    for y in range(H):
        for x in range(W):
            v = dem.elev(int(y * step), int(x * step))
            vals.append(v if v is not None else -9000)
    lo, hi = min(vals), max(vals)
    print("thumbnail range", lo, hi)
    for i, v in enumerate(vals):
        px[i] = int(max(0, min(255, (v - lo) / (hi - lo) * 255)))
    png_gray("/tmp/lola_thumb.png", W, H, px)
    print("wrote /tmp/lola_thumb.png")

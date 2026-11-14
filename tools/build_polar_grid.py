#!/usr/bin/env python3
"""Build the browser custom-pin DEM from the LOLA 80 m south-polar grid.

Input : data/lola/ldem_80s_80m.img (7600 x 7600, Int16 LE, 80 m/px)
Output: public/data/polar-dem-640m.bin (950 x 950, Int16 LE, 640 m/px)

The 640 m grid is an 8x stride sample. It powers live custom-coordinate
screening in the browser; curated sites still use the 20 m product.
"""
from pathlib import Path

N80 = 7600
N640 = 950
STRIDE = 8
ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "lola" / "ldem_80s_80m.img"
DST = ROOT / "public" / "data" / "polar-dem-640m.bin"


def main() -> None:
    raw = SRC.read_bytes()
    expected = N80 * N80 * 2
    if len(raw) < expected:
        raise SystemExit(f"{SRC} is truncated: {len(raw)} bytes, expected {expected}")

    out = bytearray(N640 * N640 * 2)
    for row in range(N640):
        src_row = row * STRIDE + STRIDE // 2
        src_off = src_row * N80 * 2
        for col in range(N640):
            src_col = col * STRIDE + STRIDE // 2
            off = src_off + src_col * 2
            dst = (row * N640 + col) * 2
            out[dst : dst + 2] = raw[off : off + 2]

    DST.parent.mkdir(parents=True, exist_ok=True)
    DST.write_bytes(out)
    print(f"wrote {DST} ({len(out) // 1024} KB, {N640}x{N640}, 640 m/px)")


if __name__ == "__main__":
    main()

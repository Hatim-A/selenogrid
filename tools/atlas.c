/*
 * atlas.c — LOLA south polar DEM -> full-resolution shaded-relief atlas.
 *
 * Input : data/lola/ldem_80s_80m.img
 *         7600 x 7600 little-endian int16, 80 m/pix, south polar
 *         stereographic, north-up, 0 deg E up.
 *         DN * 0.5 = elevation (m) relative to a 1737.4 km sphere.
 *         DN = -32768 is no-data.
 * Output: /tmp/atlas.ppm (P6, 7600 x 7600, 8-bit)
 *
 * Hillshade: illumination from NW (azimuth 315 deg, altitude 45 deg),
 * gradient over the native 80 m pixel spacing, 1.5x vertical exaggeration.
 * Two 5-tap Gaussian pre-blur passes keep the 80 m LOLA interpolation noise
 * from turning the relief into grit; they do not change the gradient scale.
 * No-data is filled neutrally and rendered as the #08090c background.
 *
 * Build: cc -O2 -o tools/atlas tools/atlas.c -lm
 * Use:   tools/atlas [dem.img] [out.ppm]
 */
#define _GNU_SOURCE
#include <errno.h>
#include <math.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define PIX 80.0
#define VEX 1.5
#define NODATA (-32768)
#define LUTN 4096

static long N;
static int16_t *dn;
static float *hgt;
static unsigned char lut[LUTN][3];

static void die(const char *msg) {
  fprintf(stderr, "atlas: %s\n", msg);
  exit(1);
}

static void read_dem(const char *path) {
  FILE *f = fopen(path, "rb");
  if (!f) {
    fprintf(stderr, "atlas: cannot open %s: %s\n", path, strerror(errno));
    exit(1);
  }
  if (fseek(f, 0, SEEK_END) != 0) die("seek failed");
  long sz = ftell(f);
  rewind(f);
  if (sz <= 0 || sz % 2) die("unexpected DEM size");
  long n = (long)lrint(sqrt((double)sz / 2.0));
  if (n <= 0 || n * n * 2 != sz) die("DEM is not a square int16 grid");
  N = n;
  dn = malloc((size_t)N * N * sizeof(*dn));
  if (!dn) die("out of memory for DEM");
  if (fread(dn, sizeof(*dn), (size_t)N * N, f) != (size_t)N * N)
    die("short read on DEM");
  fclose(f);
  printf("atlas: %s  %ld x %ld  %.0f m/pix\n", path, N, N, PIX);
}

/*
 * Separable 5-tap Gaussian [1 4 6 4 1]/16 (sigma ~1 px), applied twice
 * (sigma ~1.4 px). No-data samples are excluded from the weighted average,
 * so holes are filled smoothly from their valid neighbours.
 */
static void smooth_dem(void) {
  static const float k[5] = {1.f, 4.f, 6.f, 4.f, 1.f};
  float *tmp = malloc((size_t)N * N * sizeof(*tmp));
  hgt = malloc((size_t)N * N * sizeof(*hgt));
  if (!tmp || !hgt) die("out of memory for elevation grid");

  for (long r = 0; r < N; r++)
    for (long c = 0; c < N; c++) {
      int16_t v = dn[r * N + c];
      hgt[r * N + c] = v == NODATA ? 0.f : (float)(0.5 * v);
    }

  for (int pass = 0; pass < 2; pass++) {
    for (long r = 0; r < N; r++) {
      const float *src = hgt + r * N;
      float *dst = tmp + r * N;
      for (long c = 0; c < N; c++) {
        double sum = 0.0, wsum = 0.0;
        for (int j = -2; j <= 2; j++) {
          long cc = c + j;
          if (cc < 0) cc = 0;
          if (cc >= N) cc = N - 1;
          if (pass == 0 && dn[r * N + cc] == NODATA) continue;
          sum += k[j + 2] * (double)src[cc];
          wsum += k[j + 2];
        }
        dst[c] = wsum > 0.0 ? (float)(sum / wsum) : 0.f;
      }
    }

    for (long c = 0; c < N; c++) {
      for (long r = 0; r < N; r++) {
        double sum = 0.0, wsum = 0.0;
        for (int j = -2; j <= 2; j++) {
          long rr = r + j;
          if (rr < 0) rr = 0;
          if (rr >= N) rr = N - 1;
          if (pass == 0 && dn[rr * N + c] == NODATA) continue;
          sum += k[j + 2] * (double)tmp[rr * N + c];
          wsum += k[j + 2];
        }
        hgt[r * N + c] = wsum > 0.0 ? (float)(sum / wsum) : 0.f;
      }
    }
  }
  free(tmp);
}

/* Filmic slate ramp: near-black -> #4b5563 midtone -> soft cool highlight. */
struct stop {
  double t;
  int r, g, b;
};

static void build_lut(void) {
  static const struct stop s[] = {
      {0.00, 8, 9, 12},       /* #08090c background / full shadow */
      {0.08, 10, 13, 19},     {0.20, 18, 23, 32},    {0.34, 29, 36, 48},
      {0.46, 52, 61, 73},     {0.52, 75, 85, 99},    /* #4b5563 */
      {0.64, 100, 110, 126},  {0.76, 130, 141, 158}, {0.88, 170, 180, 196},
      {0.96, 205, 213, 226},  {1.00, 224, 231, 242} /* #e0e7f2, never white */
  };
  const int ns = (int)(sizeof(s) / sizeof(s[0]));

  for (int i = 0; i < LUTN; i++) {
    double shade = (double)i / (LUTN - 1.0);
    double t = pow(shade, 1.9); /* flat ground ~0.707 -> midtone */
    int j = 0;
    while (j < ns - 2 && t > s[j + 1].t) j++;
    double u = (t - s[j].t) / (s[j + 1].t - s[j].t);
    if (u < 0) u = 0;
    if (u > 1) u = 1;
    lut[i][0] = (unsigned char)lrint(s[j].r + u * (s[j + 1].r - s[j].r));
    lut[i][1] = (unsigned char)lrint(s[j].g + u * (s[j + 1].g - s[j].g));
    lut[i][2] = (unsigned char)lrint(s[j].b + u * (s[j + 1].b - s[j].b));
  }
}

/* Height at (r,c), substituting the centre for no-data neighbours. */
static inline double h_at(long r, long c, double hc) {
  if (r < 0 || c < 0 || r >= N || c >= N) return hc;
  if (dn[r * N + c] == NODATA) return hc;
  return hgt[r * N + c];
}

static void write_ppm(const char *path) {
  FILE *f = fopen(path, "wb");
  if (!f) {
    fprintf(stderr, "atlas: cannot write %s: %s\n", path, strerror(errno));
    exit(1);
  }
  fprintf(f, "P6\n%ld %ld\n255\n", N, N);

  unsigned char *row = malloc((size_t)N * 3);
  if (!row) die("out of memory for output row");

  const double lx = -0.5;               /* light from NW, az 315 */
  const double ly = 0.5;                /* +y = north */
  const double lz = 0.7071067811865476; /* altitude 45 deg */
  double sum = 0.0, mn = 1e9, mx = -1e9;
  long valid = 0, holes = 0;

  for (long r = 0; r < N; r++) {
    for (long c = 0; c < N; c++) {
      long idx = r * N + c;
      if (dn[idx] == NODATA) {
        row[c * 3 + 0] = lut[0][0];
        row[c * 3 + 1] = lut[0][1];
        row[c * 3 + 2] = lut[0][2];
        holes++;
        continue;
      }

      double hc = hgt[idx];
      double hl = h_at(r, c - 1, hc);
      double hr = h_at(r, c + 1, hc);
      double hu = h_at(r - 1, c, hc);
      double hd = h_at(r + 1, c, hc);

      double dzdx, dzdy;
      if (c > 0 && c < N - 1)
        dzdx = (hr - hl) / (2.0 * PIX);
      else if (c > 0)
        dzdx = (hc - hl) / PIX;
      else
        dzdx = (hr - hc) / PIX;

      if (r > 0 && r < N - 1)
        dzdy = (hu - hd) / (2.0 * PIX);
      else if (r > 0)
        dzdy = (hu - hc) / PIX;
      else
        dzdy = (hc - hd) / PIX;

      dzdx *= VEX;
      dzdy *= VEX;

      /* Surface normal from the height field; light toward the source. */
      double nx = -dzdx, ny = -dzdy, nz = 1.0;
      double inv = 1.0 / sqrt(nx * nx + ny * ny + 1.0);
      double shade = (nx * lx + ny * ly + nz * lz) * inv;
      if (shade < 0.0) shade = 0.0;
      if (shade > 1.0) shade = 1.0;
      shade = 0.045 + 0.955 * shade; /* gentle lift, no crushed blacks */

      int li = (int)(shade * (LUTN - 1) + 0.5);
      if (li < 0) li = 0;
      if (li >= LUTN) li = LUTN - 1;
      row[c * 3 + 0] = lut[li][0];
      row[c * 3 + 1] = lut[li][1];
      row[c * 3 + 2] = lut[li][2];

      sum += shade;
      if (shade < mn) mn = shade;
      if (shade > mx) mx = shade;
      valid++;
    }
    if (fwrite(row, 3, (size_t)N, f) != (size_t)N) die("short write");
  }

  free(row);
  if (fclose(f) != 0) die("close failed");
  printf("atlas: wrote %s  mean shade %.3f  range %.3f..%.3f  "
         "valid %ld  no-data %ld\n",
         path, valid ? sum / valid : 0.0, mn, mx, valid, holes);
}

int main(int argc, char **argv) {
  const char *in = argc > 1 ? argv[1] : "data/lola/ldem_80s_80m.img";
  const char *out = argc > 2 ? argv[2] : "/tmp/atlas.ppm";

  read_dem(in);
  smooth_dem();
  build_lut();
  write_ppm(out);
  free(dn);
  free(hgt);
  return 0;
}

/*
 * horizon.c — LOLA polar DEM -> per-site terrain horizon profiles.
 *
 * For each site (lat, lon):
 *   - optionally refine to the highest point within a 7 km radius whose
 *     1 km-baseline slope is <= 12 deg (representative landing-friendly peak)
 *   - compute elevation, 1 km-baseline slope + downslope aspect
 *   - ray-march 1440 azimuth bins (0.25 deg) out to 220 km, with exact
 *     lunar curvature and spherical geometry, and store max elevation angle
 *   - emit a 200x200 / 60 m hillshade tile (uint8, base64)
 *
 * Build: cc -O2 -o horizon horizon.c -lm
 * Use:   ./horizon <dem.img> <N> <pixM> <out.json> <sites.csv>
 * CSV:   id,lat,lon,refine
 */
#define _GNU_SOURCE
#include <errno.h>
#include <fcntl.h>
#include <math.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/mman.h>
#include <sys/stat.h>
#include <unistd.h>

#define NBINS 1440
#define DEG (M_PI / 180.0)
#define R 1737400.0

static const int16_t *dem;
static long N;
static double PIX, OFF, SCALE = 0.5;

static int elev_rc(long row, long col, double *out) {
  if (row < 0 || col < 0 || row >= N || col >= N) return 0;
  int16_t v = dem[row * N + col];
  if (v == -32768) return 0;
  *out = (double)v * SCALE;
  return 1;
}

/* Bilinear DEM sample at selenographic lat/lon (deg). */
static int sample_ll(double lat, double lon, double *out) {
  double colat = lat + 90.0;
  if (colat < 0) colat = 0;
  double r = 2.0 * R * tan(colat * DEG / 2.0);
  double x = r * sin(lon * DEG);
  double y = r * cos(lon * DEG);
  double row = OFF - y / PIX;
  double col = OFF + x / PIX;
  long r0 = (long)floor(row), c0 = (long)floor(col);
  double fr = row - r0, fc = col - c0;
  double v00, v01, v10, v11;
  if (!elev_rc(r0, c0, &v00) || !elev_rc(r0, c0 + 1, &v01) ||
      !elev_rc(r0 + 1, c0, &v10) || !elev_rc(r0 + 1, c0 + 1, &v11))
    return 0;
  *out = v00 * (1 - fr) * (1 - fc) + v01 * (1 - fr) * fc +
         v10 * fr * (1 - fc) + v11 * fr * fc;
  return 1;
}

/* Spherical destination: distance s (m), azimuth az (deg from north). */
static void dest(double lat, double lon, double az, double s, double *lat2,
                 double *lon2) {
  double d = s / R;
  double slat = lat * DEG, slon = lon * DEG, saz = az * DEG;
  double sd = sin(d), cd = cos(d);
  double s2 = sin(slat) * cd + cos(slat) * sd * cos(saz);
  if (s2 > 1) s2 = 1;
  if (s2 < -1) s2 = -1;
  double la = asin(s2);
  double lo = slon + atan2(sin(saz) * sd * cos(slat), cd - sin(slat) * s2);
  *lat2 = la / DEG;
  *lon2 = fmod(lo / DEG + 540.0, 360.0) - 180.0;
}

/* Exact elevation angle of a target at surface distance s, heights h0/h. */
static double el_angle(double h0, double h, double s) {
  double r0 = R + h0, r1 = R + h;
  double phi = s / R;
  double up = r1 * cos(phi) - r0;
  double horiz = r1 * sin(phi);
  return atan2(up, horiz) / DEG;
}

/* Plane fit over 8 azimuths x 2 radii (500,1000 m). */
static double slope_at(double lat, double lon, double h0, double *aspect) {
  double sa = 0, sb = 0, saa = 0, sbb = 0;
  double radii[2] = {500.0, 1000.0};
  for (int i = 0; i < 8; i++) {
    double az = i * 45.0;
    for (int k = 0; k < 2; k++) {
      double la, lo, h;
      dest(lat, lon, az, radii[k], &la, &lo);
      if (!sample_ll(la, lo, &h)) continue;
      double e = radii[k] * sin(az * DEG);
      double n = radii[k] * cos(az * DEG);
      double dz = h - h0;
      sa += e * dz;
      sb += n * dz;
      saa += e * e;
      sbb += n * n;
    }
  }
  double a = saa > 0 ? sa / saa : 0;
  double b = sbb > 0 ? sb / sbb : 0;
  if (aspect)
    *aspect = fmod(atan2(-a, -b) / DEG + 360.0, 360.0);
  return atan(hypot(a, b)) / DEG;
}

static void base64_write(FILE *f, const unsigned char *buf, size_t len) {
  static const char t[] =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  size_t i = 0;
  for (; i + 2 < len; i += 3) {
    unsigned v = (buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2];
    fputc(t[(v >> 18) & 63], f);
    fputc(t[(v >> 12) & 63], f);
    fputc(t[(v >> 6) & 63], f);
    fputc(t[v & 63], f);
  }
  if (i < len) {
    unsigned v = buf[i] << 16;
    if (i + 1 < len) v |= buf[i + 1] << 8;
    fputc(t[(v >> 18) & 63], f);
    fputc(t[(v >> 12) & 63], f);
    fputc(i + 1 < len ? t[(v >> 6) & 63] : '=', f);
    fputc('=', f);
  }
}

typedef struct {
  char id[96];
  double lat, lon;
  int refine;
} Site;

int main(int argc, char **argv) {
  if (argc != 6) {
    fprintf(stderr, "usage: %s dem.img N pixM out.json sites.csv\n", argv[0]);
    return 2;
  }
  N = atol(argv[2]);
  PIX = atof(argv[3]);
  OFF = (N - 1) / 2.0;

  int fd = open(argv[1], O_RDONLY);
  if (fd < 0) {
    perror("open dem");
    return 1;
  }
  struct stat st;
  fstat(fd, &st);
  off_t want = (off_t)N * N * 2;
  fprintf(stderr, "dem %s: %lld bytes (expected %lld)\n", argv[1],
          (long long)st.st_size, (long long)want);
  if (st.st_size < want) {
    fprintf(stderr, "DEM is incomplete; refusing to run.\n");
    return 1;
  }
  dem = mmap(NULL, (size_t)want, PROT_READ, MAP_PRIVATE, fd, 0);
  if (dem == MAP_FAILED) {
    perror("mmap");
    return 1;
  }

  FILE *cf = fopen(argv[5], "r");
  if (!cf) {
    perror("sites.csv");
    return 1;
  }
  Site sites[64];
  int ns = 0;
  char line[512];
  while (fgets(line, sizeof(line), cf)) {
    if (line[0] == '#' || line[0] == '\n') continue;
    Site *s = &sites[ns];
    if (sscanf(line, "%95[^,],%lf,%lf,%d", s->id, &s->lat, &s->lon,
               &s->refine) >= 3) {
      if (strchr(line, ',') && strstr(line, ",0") == NULL &&
          strstr(line, ",1") == NULL)
        s->refine = 0;
      ns++;
      if (ns >= 64) break;
    }
  }
  fclose(cf);
  fprintf(stderr, "sites: %d\n", ns);

  FILE *out = fopen(argv[4], "w");
  if (!out) {
    perror("out.json");
    return 1;
  }
  fprintf(out,
          "{\"dem\":{\"file\":\"%s\",\"n\":%ld,\"pixelM\":%.1f},"
          "\"sites\":[",
          argv[1], N, PIX);

  for (int si = 0; si < ns; si++) {
    Site *s = &sites[si];
    double lat = s->lat, lon = s->lon, h0;
    if (!sample_ll(lat, lon, &h0)) {
      fprintf(stderr, "WARN %s: no DEM at %.5f %.5f, skipping\n", s->id, lat,
              lon);
      continue;
    }

    if (s->refine) {
      double best_h = -1e9, best_lat = lat, best_lon = lon;
      double best_slope = 0;
      const double range = 7000.0, step = 300.0;
      for (double dy = -range; dy <= range + 1; dy += step) {
        for (double dx = -range; dx <= range + 1; dx += step) {
          double d = hypot(dx, dy);
          double az = atan2(dx, dy) / DEG;
          double la, lo, h;
          dest(lat, lon, az, d, &la, &lo);
          if (!sample_ll(la, lo, &h)) continue;
          double sl = slope_at(la, lo, h, NULL);
          if (sl <= 12.0 && h > best_h) {
            best_h = h;
            best_lat = la;
            best_lon = lo;
            best_slope = sl;
          }
        }
      }
      if (best_h > -1e8) {
        fprintf(stderr, "refine %s: %.5f %.5f %.0fm/%.1fdeg -> %.5f %.5f %.0fm/%.1fdeg\n",
                s->id, lat, lon, h0, slope_at(lat, lon, h0, NULL), best_lat,
                best_lon, best_h, best_slope);
        lat = best_lat;
        lon = best_lon;
        h0 = best_h;
      }
    }

    double aspect = 0;
    double slope = slope_at(lat, lon, h0, &aspect);

    double hz[NBINS], hd[NBINS];
    for (int b = 0; b < NBINS; b++) {
      double az = b * (360.0 / NBINS);
      double best = -90, bestd = 0;
      double prev = 20.0;
      for (double d = 20.0; d <= 220000.0;) {
        double stepm = d < 30000 ? 30.0 : (d < 80000 ? 60.0 : 120.0);
        double la, lo, h;
        dest(lat, lon, az, d, &la, &lo);
        if (sample_ll(la, lo, &h)) {
          double el = el_angle(h0, h, d);
          if (el > best) {
            best = el;
            bestd = d;
          }
        }
        prev = d;
        d += stepm;
      }
      hz[b] = best;
      hd[b] = bestd / 1000.0;
    }

    /* Sky openness: fraction of hemisphere above the horizon. */
    double open = 0;
    for (int b = 0; b < NBINS; b++)
      open += 1.0 - sin(hz[b] * DEG);
    open /= NBINS * 2.0;

    /* 200 x 200 tile, 60 m / px, north-up, 12 km span. */
    enum { TS = 200 };
    const double tsp = 60.0;
    double th[TS * TS];
    double tmin = 1e9, tmax = -1e9;
    for (int y = 0; y < TS; y++) {
      for (int x = 0; x < TS; x++) {
        double dx = (x - (TS - 1) / 2.0) * tsp;
        double dy = ((TS - 1) / 2.0 - y) * tsp;
        double d = hypot(dx, dy);
        double az = atan2(dx, dy) / DEG;
        double la, lo, h;
        dest(lat, lon, az, d, &la, &lo);
        if (!sample_ll(la, lo, &h)) h = h0;
        th[y * TS + x] = h;
        if (h < tmin) tmin = h;
        if (h > tmax) tmax = h;
      }
    }
    unsigned char q[TS * TS];
    double span = tmax - tmin;
    if (span < 1) span = 1;
    for (int i = 0; i < TS * TS; i++) {
      double v = (th[i] - tmin) / span * 255.0;
      q[i] = (unsigned char)(v < 0 ? 0 : (v > 255 ? 255 : v));
    }

    if (si) fprintf(out, ",");
    fprintf(out,
            "{\"id\":\"%s\",\"lat\":%.6f,\"lon\":%.6f,"
            "\"elevationM\":%.1f,\"slopeDeg\":%.2f,\"aspectDeg\":%.1f,"
            "\"openSkyFrac\":%.4f,\"horizonDeg\":[",
            s->id, lat, lon, h0, slope, aspect, open);
    for (int b = 0; b < NBINS; b++)
      fprintf(out, "%s%.2f", b ? "," : "", hz[b]);
    fprintf(out, "],\"horizonDistKm\":[");
    for (int b = 0; b < NBINS; b++)
      fprintf(out, "%s%.1f", b ? "," : "", hd[b]);
    fprintf(out,
            "],\"tile\":{\"size\":%d,\"pixelM\":%.0f,\"minM\":%.1f,"
            "\"maxM\":%.1f,\"base64\":\"",
            TS, tsp, tmin, tmax);
    base64_write(out, q, TS * TS);
    fprintf(out, "\"}}");
    fprintf(stderr,
            "%-22s lat %.5f lon %.5f h %.0fm slope %.1fdeg aspect %.0f "
            "openSky %.3f hz[0] %.2f hz[90] %.2f hz[180] %.2f hz[270] %.2f\n",
            s->id, lat, lon, h0, slope, aspect, open, hz[0], hz[360],
            hz[720], hz[1080]);
  }
  fprintf(out, "]}\n");
  fclose(out);
  fprintf(stderr, "wrote %s\n", argv[4]);
  return 0;
}

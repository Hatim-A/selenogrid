/* peaks.c — coarse top-peak finder for LOLA polar DEM (south). */
#include <math.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/mman.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>

#define R 1737400.0
#define DEG (M_PI / 180.0)

typedef struct { double h, lat, lon; } Cand;

static int cmp(const void *a, const void *b) {
  const Cand *x = a, *y = b;
  return (y->h > x->h) - (y->h < x->h);
}

int main(int argc, char **argv) {
  if (argc < 5) {
    fprintf(stderr, "usage: %s dem.img N pixM stepPx\n", argv[0]);
    return 2;
  }
  long N = atol(argv[2]);
  double pix = atof(argv[3]);
  long step = atol(argv[4]);
  double off = (N - 1) / 2.0;

  int fd = open(argv[1], O_RDONLY);
  if (fd < 0) { perror("open"); return 1; }
  const int16_t *dem = mmap(NULL, (size_t)N * N * 2, PROT_READ, MAP_PRIVATE, fd, 0);
  if (dem == MAP_FAILED) { perror("mmap"); return 1; }

  long cap = 200000, n = 0;
  Cand *c = malloc(cap * sizeof(Cand));
  for (long row = 0; row < N; row += step) {
    for (long col = 0; col < N; col += step) {
      int16_t v = dem[row * N + col];
      if (v == -32768) continue;
      double h = v * 0.5;
      if (h < 2500) continue;
      double x = (col - off) * pix, y = (off - row) * pix;
      double r = hypot(x, y);
      double lat = -90.0 + 2.0 * atan(r / (2.0 * R)) / DEG;
      double lon = atan2(x, y) / DEG;
      if (n < cap) c[n++] = (Cand){h, lat, lon};
    }
  }
  qsort(c, n, sizeof(Cand), cmp);
  fprintf(stderr, "%ld candidates above 2500 m\n", n);

  int shown = 0;
  Cand keep[40];
  for (long i = 0; i < n && shown < 40; i++) {
    int ok = 1;
    for (int j = 0; j < shown; j++) {
      double dx = (keep[j].lon - c[i].lon) * cos(c[i].lat * DEG);
      double dy = keep[j].lat - c[i].lat;
      if (hypot(dx, dy) * 30.3 < 6.0) { ok = 0; break; }
    }
    if (!ok) continue;
    keep[shown++] = c[i];
    printf("%7.0f m  %9.4f  %9.4f\n", c[i].h, c[i].lat, c[i].lon);
  }
  return 0;
}

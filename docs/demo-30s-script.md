# 30-second demo video: script and shot list

Total 30 s, five 6-second beats. Read at a calm pace, about 15 words per beat.
Record the voiceover first, then cut the visuals to it, or screen-record the
live app while reading. The finished cut is `public/demo-30s.mp4`, published at
https://hatim-a.github.io/selenogrid/demo-30s.mp4: a real-motion screen recording
with burned-in beat captions, exactly 30.0 s. It doubles as the stage backup
if the live demo fails. To add your voiceover on top:

```
ffmpeg -i public/demo-30s.mp4 -i voiceover.m4a -c:v copy -c:a aac -shortest demo-30s-voiced.mp4
```

## Beat 1 (0-6 s): the problem. Visual: landing hero.
> "A Moon landing site is not a pin on a map. It is a schedule. Sunlight and
> Earth contact come and go with the date, and static maps can't compare them."

## Beat 2 (6-12 s): the solution. Visual: compare view, slow scroll over cards.
> "SelenoGrid compares eighteen south-pole sites on one screen: real horizons,
> sunlight and Earth shares, longest windows, and the next sunset and earthset."

## Beat 3 (12-18 s): time and proof. Visual: timeline scrub, then Moon view.
> "Scrub any window from thirty to three hundred sixty-five days. Geometry is
> checked against JPL Horizons to about two hundredths of a degree."

## Beat 4 (18-24 s): transparency. Visual: ranking table and weight sliders.
> "The ranking is transparent. Four criteria, weights you control. Move a slider
> and watch the order move. Limits are stated, not hidden."

## Beat 5 (24-30 s): close. Visual: landing hero or atlas, hold the live URL.
> "Live now, free, no backend. SelenoGrid: see the Sun, hear Earth, pick the
> ground."

## Recording notes
- 1080p screen capture, app in dark theme, `?view=compare` for beat 2.
- Rehearse with a timer. One clean take beats three edited ones.
- Keep the backup: if the live demo fails on stage, play this video instead.

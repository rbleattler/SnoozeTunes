# Music Library Notes

SnoozeTunes does **not** ship with music files.

You are responsible for adding audio that you are legally allowed to use in your server.

Recommended sources:
- CC0 / public-domain recordings
- CC BY content with proper attribution
- Audio you created yourself

Place tracks in preset folders (for example `music/ambient`, `music/rain`, `music/lofi`, `music/white-noise`) and provide attribution metadata in `tracks.json` (or use `tracks.example.json` as a template).

Expected runtime layout:

```text
<your-music-root>/
  tracks.json
  ambient/
  rain/
  lofi/
  white-noise/
```

When SnoozeTunes runs in Docker, `<your-music-root>` is whatever host folder you mount to `/music`. `tracks.json` does not need to be committed to Git; it only needs to exist in that mounted folder at runtime.

SnoozeTunes makes no legal guarantees and does not provide legal advice.

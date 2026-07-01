import { describe, expect, it, vi } from 'vitest';

import { chooseRandomTrack, type Track } from '../src/audio/library.js';

describe('chooseRandomTrack', () => {
  const tracks: Track[] = [
    { path: '/music/ambient/a.mp3', name: 'a.mp3', preset: 'ambient' },
    { path: '/music/ambient/b.mp3', name: 'b.mp3', preset: 'ambient' }
  ];

  it('prefers tracks not in recent list when available', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const track = chooseRandomTrack(tracks, ['/music/ambient/a.mp3']);

    expect(track?.path).toBe('/music/ambient/b.mp3');
  });

  it('does not immediately repeat the most recent track when alternatives exist', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const track = chooseRandomTrack(tracks, ['/music/ambient/a.mp3', '/music/ambient/b.mp3']);

    expect(track?.path).toBe('/music/ambient/b.mp3');
  });

  it('repeats only when there is no alternative track', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const track = chooseRandomTrack([tracks[0]], ['/music/ambient/a.mp3']);

    expect(track?.path).toBe('/music/ambient/a.mp3');
  });
});

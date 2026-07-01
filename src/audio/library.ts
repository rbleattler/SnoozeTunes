import { readdir } from 'node:fs/promises';
import path from 'node:path';

const supportedExtensions = new Set(['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac', '.opus']);

export interface Track {
  path: string;
  name: string;
  preset: string;
}

export const listPresets = async (libraryPath: string): Promise<string[]> => {
  const entries = await readdir(libraryPath, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
};

export const loadPresetTracks = async (libraryPath: string, preset: string): Promise<Track[]> => {
  const presetPath = path.join(libraryPath, preset);
  const entries = await readdir(presetPath, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile())
    .filter((entry) => supportedExtensions.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => ({
      path: path.join(presetPath, entry.name),
      name: entry.name,
      preset
    }));
};

export const chooseRandomTrack = (tracks: Track[], recentPaths: string[]): Track | null => {
  if (tracks.length === 0) {
    return null;
  }

  if (tracks.length === 1) {
    return tracks[0] ?? null;
  }

  const mostRecentPath = recentPaths[0];
  const nonImmediateRepeats = tracks.filter((track) => track.path !== mostRecentPath);
  const filtered = nonImmediateRepeats.filter((track) => !recentPaths.includes(track.path));
  const candidatePool = filtered.length > 0 ? filtered : nonImmediateRepeats;
  const index = Math.floor(Math.random() * candidatePool.length);
  return candidatePool[index] ?? null;
};

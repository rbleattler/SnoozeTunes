import { readFile } from 'node:fs/promises';
import path from 'node:path';

export interface TrackCredit {
  title: string;
  artist: string;
  sourceUrl: string;
  license: string;
  attribution: string;
  preset: string;
}

export interface CreditsCatalog {
  tracks: TrackCredit[];
}

export const loadCreditsCatalog = async (libraryPath: string): Promise<CreditsCatalog> => {
  const catalogPath = path.join(libraryPath, 'tracks.json');

  try {
    const raw = await readFile(catalogPath, 'utf8');
    const parsed = JSON.parse(raw) as CreditsCatalog;

    if (!Array.isArray(parsed.tracks)) {
      return { tracks: [] };
    }

    return {
      tracks: parsed.tracks.filter(
        (item) =>
          typeof item.title === 'string' &&
          typeof item.artist === 'string' &&
          typeof item.sourceUrl === 'string' &&
          typeof item.license === 'string' &&
          typeof item.attribution === 'string' &&
          typeof item.preset === 'string'
      )
    };
  } catch {
    return { tracks: [] };
  }
};

export const findCreditsByTrackName = (catalog: CreditsCatalog, trackName: string): TrackCredit[] => {
  const plainTrackName = path.parse(trackName).name.toLowerCase();
  return catalog.tracks.filter((track) => track.title.toLowerCase() === plainTrackName);
};

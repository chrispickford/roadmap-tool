import type { Deliverable, TrackAssignment } from './types';
import { toDate } from './dates';

export function assignTracks(deliverables: Deliverable[]): TrackAssignment {
  const sorted = [...deliverables].sort((a, b) => +toDate(a.start) - +toDate(b.start));
  const tracks: Date[] = []; // last end date per track
  const trackMap = new Map<number, number>();

  for (const d of sorted) {
    const dStart = toDate(d.start);
    let placed = false;
    for (let t = 0; t < tracks.length; t++) {
      if (tracks[t] <= dStart) {
        trackMap.set(d.id, t);
        tracks[t] = toDate(d.end);
        placed = true;
        break;
      }
    }
    if (!placed) {
      trackMap.set(d.id, tracks.length);
      tracks.push(toDate(d.end));
    }
  }

  return { numTracks: Math.max(tracks.length, 1), trackMap };
}

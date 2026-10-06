// Plays game cues as a tone and a short vibration, as the preferences allow.
import type { Cue } from '../../core/types';
import type { ToneOutput } from './audio';
import type { WebPrefs } from './prefs';

export type FeedbackCue = Cue | 'record';

export interface FeedbackOutput {
  play(cue: FeedbackCue): void;
}

const TONES: Record<FeedbackCue, [number, number][]> = {
  good: [[660, 90]],
  bad: [[196, 180]],
  tick: [[880, 25]],
  // a rising arpeggio for a new record
  record: [[523, 120], [659, 120], [784, 120], [1047, 260]],
};

const VIBRATION: Record<FeedbackCue, number | number[]> = {
  good: 12,
  bad: [40, 40, 40],
  tick: 0,
  record: [30, 50, 30, 50, 90],
};

export function webFeedback(prefs: WebPrefs, tones: ToneOutput): FeedbackOutput {
  return {
    play(cue) {
      const { sound, vibration } = prefs.get();
      if (sound) {
        let delay = 0;
        for (const [freq, ms] of TONES[cue]) {
          window.setTimeout(() => tones.tone(freq, ms), delay);
          delay += ms;
        }
      }
      const pattern = VIBRATION[cue];
      if (vibration && pattern && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        try {
          navigator.vibrate(pattern);
        } catch {
          // some browsers refuse without a user gesture
        }
      }
    },
  };
}

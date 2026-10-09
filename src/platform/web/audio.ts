// Short tones through Web Audio (the "Repeat" panels, cues, the Hare Race
// whistle). Created lazily on the first tone or warmUp, which always follow a
// tap, so autoplay rules are satisfied.
export interface ToneOutput {
  /** `attackMs`: rise time; the default 20 ms avoids clicks, a signal wants a sharp front */
  tone(frequency: number, durationMs: number, attackMs?: number): void;
  /** Whether Web Audio exists here at all */
  available(): boolean;
  /** Creates and resumes the context from a user gesture and plays silence through it, so the next tone starts at once */
  warmUp(): void;
  /** How long a tone started now takes to reach the speaker, as far as the browser knows (0 where it does not tell) */
  latencyMs(): number;
}

export function webTones(): ToneOutput {
  let ctx: AudioContext | null = null;
  const context = (): AudioContext => {
    ctx ??= new AudioContext({ latencyHint: 'interactive' });
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  };
  return {
    tone(frequency, durationMs, attackMs = 20) {
      try {
        const ac = context();
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        const t = ac.currentTime;
        osc.type = 'sine';
        osc.frequency.value = frequency;
        // attack, then a linear release to the end: no clicks
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.18, t + attackMs / 1000);
        gain.gain.linearRampToValueAtTime(0, t + durationMs / 1000);
        osc.connect(gain).connect(ac.destination);
        osc.start(t);
        osc.stop(t + durationMs / 1000 + 0.05);
      } catch {
        // no audio (old WebView, tests): the game works silently
      }
    },
    available: () => typeof AudioContext !== 'undefined',
    warmUp() {
      try {
        const ac = context();
        const source = ac.createBufferSource();
        source.buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * 0.05), ac.sampleRate);
        source.connect(ac.destination);
        source.start();
      } catch {
        // as in tone()
      }
    },
    latencyMs() {
      if (!ctx) return 0;
      // outputLatency: Chrome and Firefox; baseLatency: the context's own buffering
      return ((ctx.baseLatency ?? 0) + (ctx.outputLatency ?? 0)) * 1000;
    },
  };
}

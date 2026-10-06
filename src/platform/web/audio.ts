// Short tones through Web Audio (the "Repeat" panels). Created lazily on the
// first tone, which always follows a tap, so autoplay rules are satisfied.
export interface ToneOutput {
  tone(frequency: number, durationMs: number): void;
}

export function webTones(): ToneOutput {
  let ctx: AudioContext | null = null;
  return {
    tone(frequency, durationMs) {
      try {
        ctx ??= new AudioContext();
        if (ctx.state === 'suspended') void ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = ctx.currentTime;
        osc.type = 'sine';
        osc.frequency.value = frequency;
        // soft attack and release: no clicks
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
        gain.gain.linearRampToValueAtTime(0, t + durationMs / 1000);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + durationMs / 1000 + 0.05);
      } catch {
        // no audio (old WebView, tests): the game works silently
      }
    },
  };
}

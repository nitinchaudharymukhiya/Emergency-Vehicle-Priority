/**
 * Web Audio API synthesizer for emergency sirens and alert sounds.
 * Avoids any missing external mp3 files, CORS issues, or browser playback blockages.
 */

class SoundEffects {
  constructor() {
    this.audioCtx = null;
    this.isMuted = false;
  }

  init() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  /**
   * Urgent high-pitch double siren beep for new incoming ambulance at hospital
   */
  playUrgentSiren() {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = "sawtooth";
      // Siren frequency modulation (900Hz -> 1300Hz -> 900Hz)
      osc.frequency.setValueAtTime(850, now);
      osc.frequency.linearRampToValueAtTime(1350, now + 0.25);
      osc.frequency.linearRampToValueAtTime(850, now + 0.5);
      osc.frequency.linearRampToValueAtTime(1350, now + 0.75);
      osc.frequency.linearRampToValueAtTime(850, now + 1.0);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.1);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 1.1);
    } catch (e) {
      console.warn("Audio play prevented:", e);
    }
  }

  /**
   * Tactical warning ping for Traffic Junction alerts (<2 km proximity)
   */
  playTrafficAlert() {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(987.77, now); // B5 note
      osc.frequency.setValueAtTime(1318.51, now + 0.15); // E6 note

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.5);
    } catch (e) {
      console.warn("Audio play prevented:", e);
    }
  }

  /**
   * Positive chime when a junction is cleared (Green Wave activated)
   */
  playJunctionClearedChime() {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
      osc.frequency.setValueAtTime(1046.50, now + 0.3); // C6

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.7);
    } catch (e) {
      console.warn("Audio play prevented:", e);
    }
  }

  /**
   * Arrival celebration chime when ambulance reaches hospital
   */
  playArrivalChime() {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.linearRampToValueAtTime(880, now + 0.3);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.8);
    } catch (e) {
      console.warn("Audio play prevented:", e);
    }
  }
}

export const soundEffects = new SoundEffects();

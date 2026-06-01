import { useCallback, useState, useEffect } from "react";

type AmbientId = "none" | "lofi" | "rain" | "wind" | "fire" | "waves" | "cafe" | "space" | "brown";

type AudioEngine = {
  ctx: AudioContext | null;
  masterGain: GainNode | null;
  nodes: AudioNode[];
};

let engine: AudioEngine = { ctx: null, masterGain: null, nodes: [] };

function getContext(): AudioContext {
  if (!engine.ctx || engine.ctx.state === "closed") {
    engine.ctx = new AudioContext();
    engine.masterGain = engine.ctx.createGain();
    engine.masterGain.gain.value = 0.5;
    engine.masterGain.connect(engine.ctx.destination);
    engine.nodes = [];
  }
  if (engine.ctx.state === "suspended") {
    engine.ctx.resume();
  }
  return engine.ctx;
}

function stopAll() {
  engine.nodes.forEach((n) => {
    try { n.disconnect(); } catch {}
  });
  engine.nodes = [];
}

function createNoiseBuffer(ctx: AudioContext, duration: number = 2): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function startRain(ctx: AudioContext, master: GainNode) {
  // Multiple layered noise sources for realistic rain
  for (let layer = 0; layer < 3; layer++) {
    const src = ctx.createBufferSource();
    src.buffer = createNoiseBuffer(ctx, 4);
    src.loop = true;

    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 800 + layer * 600;
    bp.Q.value = 0.5;

    const gain = ctx.createGain();
    gain.gain.value = 0.12 + layer * 0.04;

    src.connect(bp);
    bp.connect(gain);
    gain.connect(master);
    src.start();
    engine.nodes.push(src, bp, gain);
  }

  // Add occasional "drip" clicks
  const clickInterval = setInterval(() => {
    if (!engine.ctx) { clearInterval(clickInterval); return; }
    const clickSrc = ctx.createBufferSource();
    const clickBuf = ctx.createBuffer(1, ctx.sampleRate * 0.02, ctx.sampleRate);
    const clickData = clickBuf.getChannelData(0);
    for (let i = 0; i < clickBuf.length; i++) {
      clickData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.005));
    }
    clickSrc.buffer = clickBuf;
    const clickGain = ctx.createGain();
    clickGain.gain.value = 0.15;
    clickSrc.connect(clickGain);
    clickGain.connect(master);
    clickSrc.start();
    engine.nodes.push(clickSrc, clickGain);
  }, 800);

  // Store interval for cleanup
  (engine as any)._intervals = (engine as any)._intervals || [];
  (engine as any)._intervals.push(clickInterval);
}

function startFire(ctx: AudioContext, master: GainNode) {
  // Crackling fire: filtered noise with pops
  const src = ctx.createBufferSource();
  src.buffer = createNoiseBuffer(ctx, 3);
  src.loop = true;

  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 400;
  lp.Q.value = 0.7;

  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 80;

  const gain = ctx.createGain();
  gain.gain.value = 0.3;

  // LFO for flickering
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 3 + Math.random() * 2;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.15;
  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);
  lfo.start();

  src.connect(hp);
  hp.connect(lp);
  lp.connect(gain);
  gain.connect(master);
  src.start();

  engine.nodes.push(src, lp, hp, gain, lfo, lfoGain);

  // Random crackle pops
  const popInterval = setInterval(() => {
    if (!engine.ctx) { clearInterval(popInterval); return; }
    const popCount = 1 + Math.floor(Math.random() * 3);
    for (let p = 0; p < popCount; p++) {
      setTimeout(() => {
        if (!engine.ctx) return;
        const pop = ctx.createBufferSource();
        const popBuf = ctx.createBuffer(1, ctx.sampleRate * 0.03, ctx.sampleRate);
        const popData = popBuf.getChannelData(0);
        for (let i = 0; i < popBuf.length; i++) {
          popData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.008));
        }
        pop.buffer = popBuf;
        const popGain = ctx.createGain();
        popGain.gain.value = 0.08 + Math.random() * 0.12;
        const popFilt = ctx.createBiquadFilter();
        popFilt.type = "bandpass";
        popFilt.frequency.value = 800 + Math.random() * 2000;
        popFilt.Q.value = 2;
        pop.connect(popFilt);
        popFilt.connect(popGain);
        popGain.connect(master);
        pop.start();
        engine.nodes.push(pop, popFilt, popGain);
      }, Math.random() * 200);
    }
  }, 400);

  (engine as any)._intervals = (engine as any)._intervals || [];
  (engine as any)._intervals.push(popInterval);
}

function startWaves(ctx: AudioContext, master: GainNode) {
  // Ocean waves: noise with slow amplitude modulation
  const src = ctx.createBufferSource();
  src.buffer = createNoiseBuffer(ctx, 6);
  src.loop = true;

  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 200;
  bp.Q.value = 1.2;

  const gain = ctx.createGain();
  gain.gain.value = 0.35;

  // LFO for wave swell effect
  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.08;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.2;
  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);
  lfo.start();

  // Second LFO for texture
  const lfo2 = ctx.createOscillator();
  lfo2.type = "sine";
  lfo2.frequency.value = 0.15;
  const lfo2Gain = ctx.createGain();
  lfo2Gain.gain.value = 0.08;
  lfo2.connect(lfo2Gain);
  lfo2Gain.connect(gain.gain);
  lfo2.start();

  src.connect(bp);
  bp.connect(gain);
  gain.connect(master);
  src.start();

  engine.nodes.push(src, bp, gain, lfo, lfoGain, lfo2, lfo2Gain);
}

function startCafe(ctx: AudioContext, master: GainNode) {
  // Coffee shop ambiance: background hum + soft chatter texture
  const src = ctx.createBufferSource();
  src.buffer = createNoiseBuffer(ctx, 5);
  src.loop = true;

  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 300;

  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 3000;

  const gain = ctx.createGain();
  gain.gain.value = 0.15;

  src.connect(hp);
  hp.connect(lp);
  lp.connect(gain);
  gain.connect(master);
  src.start();

  // Low hum (fridge/cafe machine)
  const hum = ctx.createOscillator();
  hum.type = "sine";
  hum.frequency.value = 60;
  const humGain = ctx.createGain();
  humGain.gain.value = 0.04;
  hum.connect(humGain);
  humGain.connect(master);
  hum.start();

  engine.nodes.push(src, hp, lp, gain, hum, humGain);

  // Random clatter sounds
  const clatterInterval = setInterval(() => {
    if (!engine.ctx) { clearInterval(clatterInterval); return; }
    const clatter = ctx.createBufferSource();
    const clatterBuf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
    const clatterData = clatterBuf.getChannelData(0);
    for (let i = 0; i < clatterBuf.length; i++) {
      clatterData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.01));
    }
    clatter.buffer = clatterBuf;
    const clatterFilt = ctx.createBiquadFilter();
    clatterFilt.type = "bandpass";
    clatterFilt.frequency.value = 1500 + Math.random() * 1000;
    const clatterGain = ctx.createGain();
    clatterGain.gain.value = 0.05;
    clatter.connect(clatterFilt);
    clatterFilt.connect(clatterGain);
    clatterGain.connect(master);
    clatter.start();
    engine.nodes.push(clatter, clatterFilt, clatterGain);
  }, 2000);

  (engine as any)._intervals = (engine as any)._intervals || [];
  (engine as any)._intervals.push(clatterInterval);
}

function startBrownNoise(ctx: AudioContext, master: GainNode) {
  const src = ctx.createBufferSource();
  src.buffer = createNoiseBuffer(ctx, 4);
  src.loop = true;

  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 150;
  lp.Q.value = 0.5;

  const gain = ctx.createGain();
  gain.gain.value = 0.4;

  src.connect(lp);
  lp.connect(gain);
  gain.connect(master);
  src.start();

  engine.nodes.push(src, lp, gain);
}

function startWind(ctx: AudioContext, master: GainNode) {
  // Wind: filtered noise with slow LFO
  const src = ctx.createBufferSource();
  src.buffer = createNoiseBuffer(ctx, 5);
  src.loop = true;

  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 600;

  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 4000;

  const gain = ctx.createGain();
  gain.gain.value = 0.2;

  // LFO for wind gusts
  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.06;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.15;
  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);
  lfo.start();

  // LFO sweeping filter
  const filterLfo = ctx.createOscillator();
  filterLfo.type = "sine";
  filterLfo.frequency.value = 0.04;
  const filterLfoGain = ctx.createGain();
  filterLfoGain.gain.value = 1000;
  filterLfo.connect(filterLfoGain);
  filterLfoGain.connect(lp.frequency);
  filterLfo.start();

  src.connect(hp);
  hp.connect(lp);
  lp.connect(gain);
  gain.connect(master);
  src.start();

  engine.nodes.push(src, hp, lp, gain, lfo, lfoGain, filterLfo, filterLfoGain);
}

function startLofi(ctx: AudioContext, master: GainNode) {
  // Simple lo-fi beat: kick + hi-hat loop
  const bpm = 80;
  const beatInterval = 60 / bpm;

  const scheduleBeat = () => {
    if (!engine.ctx) return;
    const now = engine.ctx.currentTime;

    // Kick drum
    const kick = engine.ctx.createOscillator();
    kick.type = "sine";
    kick.frequency.setValueAtTime(150, now);
    kick.frequency.exponentialRampToValueAtTime(40, now + 0.1);
    const kickGain = engine.ctx.createGain();
    kickGain.gain.setValueAtTime(0.3, now);
    kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    kick.connect(kickGain);
    kickGain.connect(master);
    kick.start(now);
    kick.stop(now + 0.2);
    engine.nodes.push(kick, kickGain);

    // Hi-hat on offbeats
    for (let eighth = 1; eighth < 8; eighth += 2) {
      const hatTime = now + eighth * (beatInterval / 2);
      const hat = engine.ctx!.createBufferSource();
      const hatBuf = engine.ctx!.createBuffer(1, engine.ctx!.sampleRate * 0.05, engine.ctx!.sampleRate);
      const hatData = hatBuf.getChannelData(0);
      for (let i = 0; i < hatBuf.length; i++) {
        hatData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (engine.ctx!.sampleRate * 0.008));
      }
      hat.buffer = hatBuf;
      const hatFilt = engine.ctx!.createBiquadFilter();
      hatFilt.type = "highpass";
      hatFilt.frequency.value = 5000;
      const hatGain = engine.ctx!.createGain();
      hatGain.gain.value = 0.08;
      hat.connect(hatFilt);
      hatFilt.connect(hatGain);
      hatGain.connect(master);
      hat.start(hatTime);
      engine.nodes.push(hat, hatFilt, hatGain);
    }

    // Schedule next loop
    if (engine.ctx) {
      const beatId = setTimeout(scheduleBeat, beatInterval * 1000 * 4);
      (engine as any)._beatInterval = beatId;
    }
  };

  scheduleBeat();

  // Soft pad underneath
  const padLfo = ctx.createOscillator();
  padLfo.type = "sine";
  padLfo.frequency.value = 0.1;
  const padGain = ctx.createGain();
  padGain.gain.value = 0.06;

  const padOsc = ctx.createOscillator();
  padOsc.type = "triangle";
  padOsc.frequency.value = 220;
  const padOsc2 = ctx.createOscillator();
  padOsc2.type = "triangle";
  padOsc2.frequency.value = 293;

  padLfo.connect(padOsc.frequency);
  padOsc.connect(padGain);
  padOsc2.connect(padGain);
  padGain.connect(master);
  padOsc.start();
  padOsc2.start();
  padLfo.start();

  engine.nodes.push(padOsc, padOsc2, padGain, padLfo);
}

function startSpace(ctx: AudioContext, master: GainNode) {
  // Deep space: ambient drones with slow modulation
  const freqs = [55, 65, 72, 88];
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;

    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.05 + i * 0.01;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 3;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start();

    const gain = ctx.createGain();
    gain.gain.value = 0.04;

    osc.connect(gain);
    gain.connect(master);
    osc.start();

    engine.nodes.push(osc, lfo, lfoGain, gain);
  });

  // Subtle noise
  const src = ctx.createBufferSource();
  src.buffer = createNoiseBuffer(ctx, 6);
  src.loop = true;
  const spaceHp = ctx.createBiquadFilter();
  spaceHp.type = "highpass";
  spaceHp.frequency.value = 2000;
  const spaceGain = ctx.createGain();
  spaceGain.gain.value = 0.02;
  src.connect(spaceHp);
  spaceHp.connect(spaceGain);
  spaceGain.connect(master);
  src.start();
  engine.nodes.push(src, spaceHp, spaceGain);
}

const soundStarters: Record<string, (ctx: AudioContext, master: GainNode) => void> = {
  rain: startRain,
  fire: startFire,
  waves: startWaves,
  cafe: startCafe,
  brown: startBrownNoise,
  wind: startWind,
  lofi: startLofi,
  space: startSpace,
};

export function useAmbientAudio() {
  const [activeSound, setActiveSound] = useState<AmbientId>("none");
  const [volume, setVolumeState] = useState(0.5);
  const [muted, setMutedState] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const stopSound = useCallback(() => {
    stopAll();
    // Clear intervals
    const intervals = (engine as any)._intervals;
    if (intervals) {
      intervals.forEach((id: number) => clearInterval(id));
      (engine as any)._intervals = [];
    }
    clearTimeout((engine as any)._beatInterval);
    setIsPlaying(false);
  }, []);

  const playSound = useCallback((id: AmbientId) => {
    stopSound();

    if (id === "none") {
      setActiveSound("none");
      return;
    }

    try {
      const ctx = getContext();
      if (!engine.masterGain) return;

      // Reset master gain
      engine.masterGain.gain.value = muted ? 0 : volume;

      const starter = soundStarters[id];
      if (starter) {
        starter(ctx, engine.masterGain);
        setActiveSound(id);
        setIsPlaying(true);
        console.log(`[AmbientAudio] Playing: ${id}`);
      }
    } catch (err) {
      console.error(`[AmbientAudio] Error starting ${id}:`, err);
    }
  }, [volume, muted, stopSound]);

  const setVolume = useCallback((val: number) => {
    setVolumeState(val);
    if (engine.masterGain && !muted) {
      engine.masterGain.gain.value = val;
    }
  }, [muted]);

  const toggleMute = useCallback(() => {
    setMutedState((prev) => {
      const newMuted = !prev;
      if (engine.masterGain) {
        engine.masterGain.gain.value = newMuted ? 0 : volume;
      }
      return newMuted;
    });
  }, [volume]);

  const fadeOut = useCallback((duration: number = 500) => {
    if (!engine.masterGain) return;
    const currentTime = engine.ctx?.currentTime || 0;
    engine.masterGain.gain.setValueAtTime(engine.masterGain.gain.value, currentTime);
    engine.masterGain.gain.linearRampToValueAtTime(0, currentTime + duration / 1000);
    setTimeout(() => {
      stopSound();
      if (engine.masterGain) engine.masterGain.gain.value = volume;
    }, duration);
  }, [volume, stopSound]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSound();
    };
  }, [stopSound]);

  return {
    activeSound,
    isPlaying,
    volume,
    muted,
    playSound,
    setVolume,
    toggleMute,
    fadeOut,
    stopSound,
  };
}
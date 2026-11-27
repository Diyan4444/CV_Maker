export type AnimationPref = 'system' | 'on' | 'off';
export type FloatPref = 'off' | 'subtle' | 'normal' | 'strong';
export type GlassPref = 'auto' | 'light' | 'frosted' | 'dense' | 'solid';
export type BgLevelPref = 'subtle' | 'normal' | 'strong';

export const INTERFACE_STORAGE_KEYS = {
  animations: 'quillfolio_motion',
  float: 'quillfolio_float',
  glass: 'quillfolio_glass',
  bgLevel: 'quillfolio_bg_level',
} as const;

export const FLOAT_AMPLITUDE_PX: Record<FloatPref, number> = {
  off: 0,
  subtle: 8,
  normal: 14,
  strong: 22,
};

export function readStoredAnimationsPref(): AnimationPref {
  if (typeof window === 'undefined') return 'system';
  try {
    const val = window.localStorage.getItem(INTERFACE_STORAGE_KEYS.animations);
    if (val === 'on' || val === 'off' || val === 'system') return val;
  } catch {
    // ignore storage errors
  }
  return 'system';
}

export function readStoredFloatPref(): FloatPref {
  if (typeof window === 'undefined') return 'normal';
  try {
    const val = window.localStorage.getItem(INTERFACE_STORAGE_KEYS.float);
    if (val === 'off' || val === 'subtle' || val === 'normal' || val === 'strong') return val;
  } catch {
    // ignore
  }
  return 'normal';
}

export function readStoredGlassPref(): GlassPref {
  if (typeof window === 'undefined') return 'auto';
  try {
    const val = window.localStorage.getItem(INTERFACE_STORAGE_KEYS.glass);
    if (val === 'auto' || val === 'light' || val === 'frosted' || val === 'dense' || val === 'solid') return val;
  } catch {
    // ignore
  }
  return 'auto';
}

export function readStoredBgLevelPref(): BgLevelPref {
  if (typeof window === 'undefined') return 'normal';
  try {
    const val = window.localStorage.getItem(INTERFACE_STORAGE_KEYS.bgLevel);
    if (val === 'subtle' || val === 'normal' || val === 'strong') return val;
  } catch {
    // ignore
  }
  return 'normal';
}

export function isWeakDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const cores = typeof navigator.hardwareConcurrency === 'number' ? navigator.hardwareConcurrency : 8;
  const mem = typeof (navigator as Navigator & { deviceMemory?: number }).deviceMemory === 'number'
    ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory!
    : 8;
  return cores <= 4 || mem <= 4;
}

export function resolveEffectiveGlass(pref: GlassPref): 'light' | 'frosted' | 'dense' | 'solid' | 'lite' {
  if (pref === 'auto') {
    return isWeakDevice() ? 'lite' : 'frosted';
  }
  return pref;
}

export function resolveEffectiveMotion(pref: AnimationPref): 'on' | 'off' {
  if (pref === 'on') return 'on';
  if (pref === 'off') return 'off';
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return 'off';
  }
  return 'on';
}

export function setAnimationsPreference(pref: AnimationPref): void {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.motion = resolveEffectiveMotion(pref);
    document.documentElement.dataset.motionPref = pref;
  }
  try {
    window.localStorage.setItem(INTERFACE_STORAGE_KEYS.animations, pref);
  } catch {
    // ignore
  }
}

export function setFloatPreference(pref: FloatPref): void {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.float = pref;
    document.documentElement.style.setProperty('--float-amp', `${FLOAT_AMPLITUDE_PX[pref]}px`);
  }
  try {
    window.localStorage.setItem(INTERFACE_STORAGE_KEYS.float, pref);
  } catch {
    // ignore
  }
}

export function setGlassPreference(pref: GlassPref): void {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.glassPref = pref;
    document.documentElement.dataset.glass = resolveEffectiveGlass(pref);
  }
  try {
    window.localStorage.setItem(INTERFACE_STORAGE_KEYS.glass, pref);
  } catch {
    // ignore
  }
}

export function setBgLevelPreference(pref: BgLevelPref): void {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.bgLevel = pref;
  }
  try {
    window.localStorage.setItem(INTERFACE_STORAGE_KEYS.bgLevel, pref);
  } catch {
    // ignore
  }
}

export function getInterfaceBootScript(): string {
  return `(function(){try{var d=document.documentElement,ls=window.localStorage;var m=ls.getItem('quillfolio_motion')||'system';d.dataset.motionPref=m;d.dataset.motion=m==='on'?'on':m==='off'?'off':(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches?'off':'on');var f=ls.getItem('quillfolio_float')||'normal';var amps={off:'0px',subtle:'8px',normal:'14px',strong:'22px'};d.dataset.float=amps[f]?f:'normal';d.style.setProperty('--float-amp',amps[f]||'14px');var g=ls.getItem('quillfolio_glass')||'auto';d.dataset.glassPref=g;if(g==='auto'){var c=navigator.hardwareConcurrency||8;var mem=navigator.deviceMemory||8;d.dataset.glass=(c<=4||mem<=4)?'lite':'frosted';}else{d.dataset.glass=(g==='light'||g==='frosted'||g==='dense'||g==='solid')?g:'frosted';}var b=ls.getItem('quillfolio_bg_level')||'normal';d.dataset.bgLevel=(b==='subtle'||b==='normal'||b==='strong')?b:'normal';}catch(e){}})();`;
}

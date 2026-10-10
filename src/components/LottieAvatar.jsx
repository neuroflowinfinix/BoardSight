import React, { useState, useEffect } from 'react';
import LottieImport from 'lottie-react';
// lottie-react v2.x has a mixed CJS/ESM export that Vite may wrap in a
// namespace object.  Unwrap if needed so we always get the component function.
const Lottie = typeof LottieImport === 'function'
  ? LottieImport
  : LottieImport?.default ?? LottieImport;

// Module-level in-memory cache: URL → parsed animation JSON
const lottieCache = new Map();

// Fetch with caching — deduplicates in-flight requests too
function fetchLottie(url) {
  if (lottieCache.has(url)) return lottieCache.get(url);
  const promise = fetch(url)
    .then(res => res.json())
    .then(data => { lottieCache.set(url, Promise.resolve(data)); return data; })
    .catch(err => { lottieCache.delete(url); throw err; });
  lottieCache.set(url, promise);
  return promise;
}

// Call once at app startup to eagerly warm the cache
const ALL_AVATARS = [
  'blunder_male.json', 'book_male.json', 'brilliant_male.json',
  'male_best.json', 'neutral_male.json'
];
let _preloaded = false;
export function preloadLottieAvatars() {
  if (_preloaded) return;
  _preloaded = true;
  ALL_AVATARS.forEach(f => fetchLottie(`/lottie/${f}`));
}

// Resolve component function whether imported as ESM default or CJS/UMD namespace
const LottieComponent = typeof Lottie === 'function' ? Lottie : (Lottie?.default || Lottie);

export default function LottieAvatar({ src, style, loop = true, onComplete }) {
  const [animationData, setAnimationData] = useState(null);

  useEffect(() => {
    setAnimationData(null); // Clear to force Lottie remount/restart on src change
    let cancelled = false;
    fetchLottie(src)
      .then(data => { if (!cancelled) setAnimationData(data); })
      .catch(err => console.error("Error loading lottie", err));
    return () => { cancelled = true; };
  }, [src]);

  if (!animationData) return <div style={style} />;
  return <LottieComponent animationData={animationData} loop={loop} onComplete={onComplete} style={style} />;
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import Image from 'next/image';
import styles from './home.module.css';

type Props = { desktop: string; mobile: string; video?: string; defaultArtwork: boolean };
export default function HeroMedia({ desktop, mobile, video, defaultArtwork }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!video) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      if (preference.matches) ref.current?.pause();
      else ref.current?.play().catch(() => undefined);
    };
    update(); preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, [video]);
  return <div className={`${styles.media} ${defaultArtwork ? '' : styles.cmsMedia}`}>
    {defaultArtwork ? <Image src={desktop} alt="" fill priority sizes="(max-width: 760px) 100vw, 75vw" /> : <picture><source media="(max-width: 760px)" srcSet={mobile} /><img src={desktop} alt="" fetchPriority="high" /></picture>}
    {video && <><video ref={ref} src={video} poster={desktop} muted loop playsInline preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} aria-hidden="true" /><button className={styles.videoToggle} type="button" aria-label={playing ? 'Videonu dayandır' : 'Videonu oynat'} onClick={() => { if (playing) ref.current?.pause(); else ref.current?.play().catch(() => undefined); }}>{playing ? <Pause size={18} /> : <Play size={18} />}</button></>}
  </div>;
}

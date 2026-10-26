import { useEffect, useRef, useState } from "react";

export function GeeraWordmark() {
  return <span className="geera-wordmark" aria-label="Geera"><svg className="geera-g" viewBox="0 0 58 88" aria-hidden="true"><path fill="currentColor" fillRule="evenodd" d="M30 8C17 8 7 17 7 30c0 10 5 17 14 20C10 53 7 58 10 64c3 6 12 6 23 6 9 0 14 3 14 8 0 6-6 10-15 10-8 0-15-3-21-9l-7 7c7 8 17 12 29 12 15 0 25-8 25-21 0-12-9-19-24-19H23c-5 0-6-3-2-5 3-2 8-2 12-3 12-2 20-10 20-22 0-6-2-11-5-15l10-1V2C48 7 41 8 30 8Zm0 9c9 0 14 5 14 13s-5 14-14 14-14-6-14-14 5-13 14-13Z" transform="translate(0 -2) scale(.88)" /></svg><span aria-hidden="true">eera</span></span>;
}

export default function GeeraFilm({ openCanvas }: { openCanvas: () => void }) {
  const root = useRef<HTMLElement>(null);
  const film = useRef<HTMLVideoElement>(null);
  const frame = useRef<HTMLImageElement>(null);
  const [mobile] = useState(() => matchMedia("(max-width: 800px)").matches);
  const [progress, setProgress] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  useEffect(() => {
    const section = root.current!, video = film.current;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0, target = 0, failed = false;
    let disposed = false, next = 0;
    const frames = new Map<number, HTMLImageElement>();
    const loaded = new Set<number>();
    const paint = () => {
      if (!frame.current || !loaded.size) return;
      const desired = Math.round(target * 59);
      const closest = [...loaded].reduce((a, b) => Math.abs(b - desired) < Math.abs(a - desired) ? b : a);
      const source = frames.get(closest)!.src;
      if (frame.current.src !== source) frame.current.src = source;
    };
    const preload = () => {
      if (disposed || next >= 60) return;
      const index = next++, image = new Image();
      frames.set(index, image);
      image.onload = () => { if (!disposed) { loaded.add(index); paint(); preload(); } };
      image.onerror = () => { if (!disposed) preload(); };
      image.src = `${import.meta.env.BASE_URL}media/film/mobile/${index}.webp`;
    };
    // About 206 KB total, with four downloads at a time and no video seeking.
    if (mobile && !reduced.matches) for (let i = 0; i < 4; i++) preload();
    const seek = () => {
      if (mobile) { paint(); return; }
      if (!video) return;
      if (video.seeking || !Number.isFinite(video.duration) || video.duration <= 0) return;
      const time = target * Math.max(0, video.duration - .04);
      if (Math.abs(video.currentTime - time) > .025) video.currentTime = time;
    };
    const measure = () => {
      raf = 0;
      const stage = section.firstElementChild as HTMLElement;
      const span = section.offsetHeight - stage.clientHeight;
      const p = reduced.matches || failed ? 0 : Math.max(0, Math.min(1, -section.getBoundingClientRect().top / Math.max(1, span)));
      target = Math.min(1, p / .88);
      setProgress(p); setScrubbing(!reduced.matches && !failed); seek();
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(measure); };
    const onError = () => { failed = true; setScrubbing(false); setProgress(0); };
    video?.addEventListener("loadedmetadata", schedule);
    video?.addEventListener("seeked", seek);
    video?.addEventListener("error", onError);
    reduced.addEventListener("change", schedule);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    measure();
    return () => { disposed = true; frames.forEach(image => { image.onload = null; image.onerror = null; }); frames.clear(); cancelAnimationFrame(raf); video?.removeEventListener("loadedmetadata", schedule); video?.removeEventListener("seeked", seek); video?.removeEventListener("error", onError); reduced.removeEventListener("change", schedule); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); };
  }, [mobile]);
  const beat = progress < .2 ? 0 : progress < .52 ? 1 : progress < .82 ? 2 : 3;
  return <section ref={root} id="home" className={`geera-scroll-film ${scrubbing ? "is-scrubbing" : "is-still"}`} aria-label="Geera brand film">
    <div className="geera-stage">
      {mobile ? <img className="geera-film-source" ref={frame} src={`${import.meta.env.BASE_URL}media/film/mobile/0.webp`} alt="A ribbon forms Geera’s g as you scroll" /> : <video className="geera-film-source" ref={film} src={`${import.meta.env.BASE_URL}media/geera-motion.mp4`} poster={`${import.meta.env.BASE_URL}media/film/mobile/0.webp`} muted playsInline preload="auto" aria-label="A ribbon forms Geera’s g as you scroll" />}
      <header className="geera-film-nav"><a href="#home" aria-label="Geera home"><GeeraWordmark /></a><button onClick={openCanvas}>Open canvas</button></header>
      <div className="geera-film-text">
        <div className="geera-film-copy" hidden={beat !== 0}>
          <h1>Give your words shape.</h1><div><p>Speak or type an explanation.<br />Watch it draw itself.</p><button onClick={openCanvas}>Open canvas</button></div>
        </div>
        <p className="geera-film-caption" hidden={beat !== 1}>An explanation starts as a line.</p>
        <p className="geera-film-caption" hidden={beat !== 2}>Then it finds a shape.</p>
        <div className="geera-film-end" hidden={beat !== 3}><p>From the Luganda <em>tegeera</em>, meaning to understand.</p><button onClick={openCanvas}>Open canvas</button></div>
      </div>
    </div>
    {!scrubbing && <img className="geera-final-still" src={`${import.meta.env.BASE_URL}media/film/mobile/59.webp`} alt="The ribbon folded into Geera’s lowercase g." />}
  </section>;
}

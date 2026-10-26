import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import "./geera.css";
import GeeraFilm, { GeeraWordmark } from "./GeeraFilm";

const Canvas = lazy(() => import("./App"));

class CanvasBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <p role="alert">The canvas could not load. Your explanation is still above. <button onClick={() => window.location.reload()}>Reload page</button></p> : this.props.children;
  }
}

export default function GeeraExperience() {
  const [text, setText] = useState("");
  const [opened, setOpened] = useState(window.location.hash === "#canvas");
  const [request, setRequest] = useState({ id: 0, text: "" });
  const [error, setError] = useState("");
  const canvas = useRef<HTMLDivElement>(null);
  const submissions = useRef<number[]>([]);

  useEffect(() => {
    const openFromHash = () => { if (window.location.hash === "#canvas") setOpened(true); };
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, []);

  const openCanvas = () => {
    setOpened(true); window.location.hash = "canvas";
    requestAnimationFrame(() => { canvas.current?.scrollIntoView({ block: "start" }); canvas.current?.focus({ preventScroll: true }); });
  };

  return <div className="geera-site">
    <a className="geera-skip" href="#try-geera">Skip to explanation</a>
    <GeeraFilm openCanvas={openCanvas} />
    <section className="geera-opening" id="product" aria-labelledby="geera-title">
      <h2 id="geera-title">Your words. Your canvas.</h2>
      <div className="geera-intro">
        <p>Speak or type an explanation.<br />Watch it draw itself.</p>
        <form id="try-geera" onSubmit={event => {
          event.preventDefault();
          if (!text.trim()) { setError("Write an explanation first."); return; }
          // UX throttle only. Server-side rate limits and daily budgets enforce spending.
          const now = Date.now();
          submissions.current = submissions.current.filter(time => now - time < 60_000);
          const last = submissions.current.at(-1);
          if ((last !== undefined && now - last < 10_000) || submissions.current.length >= 3) {
            setError("Please wait before trying another explanation. This preview allows three submissions per minute, at least ten seconds apart."); return;
          }
          submissions.current.push(now);
          setError(""); setRequest(previous => ({ id: previous.id + 1, text: text.trim() })); openCanvas();
        }}>
          <label htmlFor="geera-explanation">What would you like to explain?</label>
          <div className="geera-input-row"><input id="geera-explanation" value={text} onChange={event => setText(event.target.value)} maxLength={1200} placeholder="A seed grows toward the sunlight…" aria-describedby="geera-input-note" /><button type="submit">Draw it</button></div>
          <p id="geera-input-note">{error || "Early access. Drawings can miss details; review them before teaching. AI explanations are sent to our model provider. Avoid personal information."}</p>
        </form>
      </div>
    </section>
    <div ref={canvas} id="canvas" className="geera-canvas" data-ui tabIndex={-1}>
      {opened && <CanvasBoundary><Suspense fallback={<p role="status">Opening your canvas…</p>}><Canvas initialExplanation={request.text} initialRequestId={request.id} embedded /></Suspense></CanvasBoundary>}
    </div>
    <section id="origin" className="geera-origin" aria-labelledby="origin-title">
      <h2 id="origin-title">Understanding<br />starts here.</h2>
      <div><p>My O-level Biology teacher struggled to write on the chalkboard. I saw how hard he worked to help us understand.</p><p>Later, struggling to explain my own ideas in presentations, I kept coming back to that classroom. Geera grew from a simple wish: let the explanation become something we can see.</p><p>Still growing, with the vision of making explanation more accessible.</p></div>
    </section>
    <footer className="geera-footer"><div><p>From the Luganda <em>tegeera</em>, meaning to understand.</p><button onClick={openCanvas}>Start explaining</button></div><a href="#home" className="geera-signoff" aria-label="Geera, back to top"><GeeraWordmark /></a></footer>
  </div>;
}

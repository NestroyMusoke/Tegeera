import type { ReactNode } from "react";
import type { SceneState } from "../doodlescript/schema";
import { type ArgumentMap, type ArgumentRole, wordingSegments } from "../arguments/sourceMap";
import { DoodleCanvas } from "./DoodleCanvas";
import "./argumentCanvas.css";

const labels: Record<ArgumentRole, string> = {
  definition: "Definition in your words", statement: "Your statement",
  comparison: "Comparison wording", question: "Open question", condition: "Conditional wording"
};
const symbols: Record<ArgumentRole, string> = { definition: "≔", statement: "“", comparison: "↔", question: "?", condition: "if" };

export function ArgumentCanvas({ map, revision }: { map: ArgumentMap; revision: number }) {
  return <section className="argument-map" aria-label="Source-preserving argument map">
    <header><span className="argument-kicker">Ideas, not just objects</span><h2>Your explanation, mapped</h2>
      <p>Original wording, not a fact-check. Headings are wording cues, not conclusions. Links show reading order—not proof or causation.</p></header>
    <ol className="argument-panels">
      {map.panels.map((panel, index) => <li key={panel.id} data-argument-id={panel.id}>
        {index > 0 && <div className="argument-link" aria-label="Next part in reading order"><span aria-hidden="true">↓</span> Next part</div>}
        <article className={`argument-panel argument-${panel.roles[0]}`}>
          <div className="argument-heading"><span className="argument-symbol" aria-hidden="true">{symbols[panel.roles[0]]}</span>
            <h3>Part {index + 1}</h3><div className="argument-tags">{panel.roles.map(role => <span key={role}>{labels[role]}</span>)}</div></div>
          <blockquote>{wordingSegments(panel.text).map((part, i) => part.negative
            ? <mark key={i}>{part.text}</mark> : <span key={i}>{part.text}</span>)}</blockquote>
        </article>
      </li>)}
    </ol>
    <footer>Negative words stay highlighted. Questions remain unanswered. Revision {revision}</footer>
  </section>;
}

export function ScenePresentation({ scene, map, children }: { scene: SceneState; map?: ArgumentMap; children?: ReactNode }) {
  return map ? <div className="visual-scene"><ArgumentCanvas map={map} revision={scene.revision} />{children}</div>
    : <DoodleCanvas scene={scene}>{children}</DoodleCanvas>;
}

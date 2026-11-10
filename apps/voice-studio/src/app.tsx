import { Dialog } from "@base-ui/react/dialog";
import { Remold } from "@remold-ui/react";
import { useEffect, useState } from "react";
import { VoiceOrb, type VoiceState } from "./voice-orb";

const transcript = "I was charged twice for last month's subscription. Can you help me fix that?";
const response = "I found the duplicate renewal. I've queued a £24.00 refund to your original payment method — it should arrive in 3–5 business days.";

type TimelineItem = { label: string; time: string; kind: "note" | "action" | "resolved" };
const initialTimeline: TimelineItem[] = [
  { label: "Customer verified", time: "Just now", kind: "note" },
  { label: "Duplicate charge detected", time: "Just now", kind: "action" },
];

export function App() {
  const [voice, setVoice] = useState<VoiceState>("idle");
  const [timeline, setTimeline] = useState(initialTimeline);
  const [replySent, setReplySent] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [queueView, setQueueView] = useState<"compact" | "expanded">("compact");

  useEffect(() => {
    if (voice !== "thinking") return;
    const timer = window.setTimeout(() => setVoice("speaking"), 1700);
    return () => window.clearTimeout(timer);
  }, [voice]);

  const listen = (listening: boolean) => {
    setVoice(listening ? "listening" : "thinking");
  };

  const sendReply = () => {
    setReplySent(true);
    setTimeline((items) => [...items, { label: "Refund request sent", time: "Now", kind: "resolved" }]);
  };

  return (
    <main>
      <nav className="topbar">
        <a className="brand" href="#top" aria-label="Clearline home"><span>c</span>clearline</a>
        <div className="nav-status"><i /> All systems operational</div>
        <button className="agent">AO <span>Amara Owusu</span><b>⌄</b></button>
      </nav>

      <div className="shell" id="top">
        <header className="page-header">
          <div><p className="eyebrow">Voice copilot</p><h1>Help, without the hold music.</h1><p className="subhead">Clearline turns a live customer conversation into useful next steps.</p></div>
          <div className="ticket-chip"><span>CS-2048</span><b>In progress</b></div>
        </header>

        <div className="workspace">
          <aside className="customer-card">
            <div className="card-heading"><span>Customer</span><button aria-label="More customer options">•••</button></div>
            <div className="person"><div className="avatar">MC</div><div><h2>Maya Chen</h2><p>maya.chen@example.com</p></div></div>
            <dl><div><dt>Plan</dt><dd>Studio <span>Active</span></dd></div><div><dt>Customer since</dt><dd>October 2023</dd></div><div><dt>Last payment</dt><dd>£24.00 · 31 Oct</dd></div></dl>
            <div className="card-divider" />
            <div className="mini-label">Recent activity</div>
            <ul className="activity"><li><i className="blue" /> Subscription renewed <time>31 Oct</time></li><li><i className="pink" /> Card charged twice <time>31 Oct</time></li></ul>
          </aside>

          <section className="voice-area">
            <div className="live-label"><span className={voice === "listening" ? "pulse" : ""} /> LIVE CONVERSATION</div>
            <VoiceOrb state={voice} onListeningChange={listen} />
            <div className="transcript-box"><div><span className="mini-label">Latest transcript</span><p>{voice === "idle" ? "Start listening to capture the conversation." : transcript}</p></div><button onClick={() => setShowTranscript(true)}>View transcript <span>↗</span></button></div>
          </section>

          <aside className="copilot-card">
            <div className="copilot-title"><div className="sparkle">✦</div><div><span className="mini-label">Copilot suggestion</span><h2>{voice === "speaking" || replySent ? "Refund ready to send" : "Finding the right resolution"}</h2></div></div>
            <p className="suggestion">{voice === "speaking" || replySent ? response : "I’m checking Maya’s payment history and subscription details."}</p>
            <div className="confidence"><span>Confidence</span><b>98%</b><div><i /></div></div>
            <div className="copilot-actions"><button className="ghost" onClick={() => setVoice("thinking")}>Regenerate</button><button className="primary" disabled={voice !== "speaking" || replySent} onClick={sendReply}>{replySent ? "Reply sent ✓" : "Send reply"}</button></div>
          </aside>
        </div>

        <section className="timeline"><div className="timeline-title"><div><p className="eyebrow">Case activity</p><h2>Everything, in context.</h2></div><button onClick={() => setTimeline(initialTimeline)}>Reset demo</button></div><ol>{timeline.map((item, index) => <li key={`${item.label}-${index}`}><i className={item.kind} /><div><strong>{item.label}</strong><span>{item.time}</span></div></li>)}</ol></section>

        <section className="primitives">
          <div className="primitive-heading"><div><p className="eyebrow">More Remold primitives</p><h2>Queue, without the jump cuts.</h2><p>Switch views to test keyless layout matching, text transitions, and icon morphing in a product surface.</p></div><div className="view-toggle"><button className={queueView === "compact" ? "selected" : ""} onClick={() => setQueueView("compact")}>Compact</button><button className={queueView === "expanded" ? "selected" : ""} onClick={() => setQueueView("expanded")}>Expanded</button></div></div>
          <Remold.Morph trigger={queueView} className="queue-morph">
            {queueView === "compact" ? <div className="queue compact"><QueueIcon done={replySent} /><div><strong>Maya Chen</strong><Remold.Text>{replySent ? "Refund request sent" : "Duplicate subscription charge"}</Remold.Text></div><span className="queue-status">{replySent ? "Resolved" : "Needs reply"}</span></div> : <div className="queue expanded"><div className="queue-person"><QueueIcon done={replySent} /><div><strong>Maya Chen</strong><span>maya.chen@example.com</span></div></div><div className="queue-detail"><span>Issue</span><Remold.Text>{replySent ? "Refund request sent" : "Duplicate subscription charge"}</Remold.Text></div><div className="queue-detail"><span>Priority</span><b>High</b></div><span className="queue-status">{replySent ? "Resolved" : "Needs reply"}</span></div>}
          </Remold.Morph>
        </section>
      </div>

      <Dialog.Root open={showTranscript} onOpenChange={setShowTranscript}><Dialog.Portal><Dialog.Backdrop className="dialog-backdrop" /><Dialog.Popup className="dialog"><Dialog.Title>Conversation transcript</Dialog.Title><Dialog.Description>Maya Chen · CS-2048</Dialog.Description><p><b>Maya:</b> {transcript}</p><p><b>Clearline:</b> {response}</p><Dialog.Close className="primary">Close</Dialog.Close></Dialog.Popup></Dialog.Portal></Dialog.Root>
    </main>
  );
}

function QueueIcon({ done }: { done: boolean }) {
  return <Remold.Icon className="queue-icon" icon={done ? <svg viewBox="0 0 24 24" fill="none"><path d="m5 12 4.2 4.2L19 6.8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg> : <svg viewBox="0 0 24 24" fill="none"><path d="M7 3.8h10a3.2 3.2 0 0 1 3.2 3.2v10a3.2 3.2 0 0 1-3.2 3.2H7A3.2 3.2 0 0 1 3.8 17V7A3.2 3.2 0 0 1 7 3.8Z" stroke="currentColor" strokeWidth="1.8" /><path d="M8 12h8M8 8.3h5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>} strokeWidth={1.8} aria-hidden="true" />;
}

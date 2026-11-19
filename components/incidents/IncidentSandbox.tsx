"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, Send, ShieldCheck } from "lucide-react";

type Report = {
  id: string;
  incident_code: string;
  incident_label: string;
  source: "demo" | "at_sandbox";
  status: string;
  received_at: string;
  polling_units: { code: string; name: string; ward: string; lga: string; state: string } | null;
};

const incidentCodes = ["VUB", "VIO", "MSB", "BOG", "INT"];

export function IncidentSandbox() {
  const [from, setFrom] = useState("+2348012345678");
  const [message, setMessage] = useState("");
  const [sampleUnit, setSampleUnit] = useState("");
  const [reports, setReports] = useState<Report[]>([]);
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/incidents", { cache: "no-store" });
      const data = await response.json();
      if (response.ok) setReports(data.reports);
      else setError(data.error ?? "Could not load reports");
    } catch {
      setError("Could not connect to the incident dashboard");
    }
  }, []);

  useEffect(() => {
    void fetch("/api/polling-units?limit=1", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        const code = data?.data?.[0]?.code;
        if (typeof code === "string") {
          setSampleUnit(code);
          setMessage(`PU${code}VUB`);
        }
      })
      .catch(() => undefined);
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setReply("");
    setError("");
    try {
      const response = await fetch("/api/sms/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, text: message }),
      });
      const data = await response.json();
      if (!response.ok) setError(data.error ?? "Message could not be processed");
      else setReply(data.reply);
      await refresh();
    } catch {
      setError("Could not submit the simulated SMS");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-2xl border border-review-text/20 bg-review-bg p-4 text-review-text md:p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle aria-hidden className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-bold">Demo data only</p>
            <p className="mt-1 text-sm">Reports submitted here are simulated. They are not from voters and must not be treated as evidence of an election incident.</p>
          </div>
        </div>
      </section>

      <section className="panel p-5 md:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Send aria-hidden className="size-5 text-brand" />
          <h2 className="font-display text-xl font-extrabold">Simulate an incoming SMS</h2>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Sender phone (demo only)
            <input className="min-h-12 rounded-xl border border-border bg-surface px-3 font-normal" value={from} onChange={(e) => setFrom(e.target.value)} maxLength={24} required />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            SMS message
            <input className="min-h-12 rounded-xl border border-border bg-surface px-3 font-mono text-sm font-normal uppercase" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} required />
          </label>
          <div className="flex flex-wrap gap-2">
            {incidentCodes.map((code) => <button key={code} type="button" disabled={!sampleUnit} className="rounded-full bg-surface-2 px-3 py-1.5 font-mono text-xs hover:bg-border disabled:opacity-50" onClick={() => setMessage(`PU${sampleUnit}${code}`)}>{code}</button>)}
          </div>
          <p className="text-xs text-muted">{sampleUnit ? <>Sample uses directory polling unit <code>{sampleUnit}</code>. Codes: VUB vote buying · VIO violence · MSB staff misbehaviour · BOG ballot grabbing · INT intimidation.</> : "Loading a sample polling-unit code from the real directory…"}</p>
          <button className="btn btn-primary min-h-12 w-full sm:w-fit sm:px-6" disabled={busy}>
            {busy ? <RefreshCw aria-hidden className="size-4 animate-spin" /> : <Send aria-hidden className="size-4" />}
            {busy ? "Processing…" : "Submit simulated SMS"}
          </button>
        </form>
        {reply && <p role="status" className="mt-4 rounded-xl bg-ok-bg p-3 text-sm text-ok-text">{reply}</p>}
        {error && <p role="alert" className="mt-4 rounded-xl bg-review-bg p-3 text-sm text-review-text">{error}</p>}
      </section>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h2 className="font-display text-xl font-extrabold">Recent reports</h2>
            <p className="mt-1 text-xs text-muted">Auto-refreshes every 5 seconds · latest 100</p>
          </div>
          <button onClick={() => void refresh()} aria-label="Refresh reports" className="grid size-10 place-items-center rounded-full bg-surface-2"><RefreshCw aria-hidden className="size-4" /></button>
        </div>
        {!reports.length ? (
          <p className="p-6 text-sm text-muted">No incident reports yet. Submit a simulated message to begin.</p>
        ) : (
          <ul className="divide-y divide-border">
            {reports.map((report) => <li key={report.id} className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-bold">{report.incident_label} <span className="font-mono text-xs text-muted">({report.incident_code})</span></p>
                <p className="mt-1 truncate font-mono text-sm">{report.polling_units?.code ?? "Unknown unit"}</p>
                <p className="mt-0.5 text-xs text-muted">{[report.polling_units?.name, report.polling_units?.ward, report.polling_units?.lga, report.polling_units?.state].filter(Boolean).join(" · ")}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-xs">
                <span className="rounded-full bg-sim-bg px-2.5 py-1 font-bold text-sim-text">{report.source === "demo" ? "SIMULATED" : "AT SANDBOX"}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-pending-bg px-2.5 py-1 text-pending-text"><ShieldCheck aria-hidden className="size-3.5" />{report.status}</span>
                <time className="text-muted">{new Date(report.received_at).toLocaleTimeString()}</time>
              </div>
            </li>)}
          </ul>
        )}
      </section>
    </div>
  );
}

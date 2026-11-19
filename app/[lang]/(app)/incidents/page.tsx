import { PageHeader } from "@/components/PageHeader";
import { IncidentSandbox } from "@/components/incidents/IncidentSandbox";

export default function IncidentsPage() {
  return (
    <>
      <PageHeader
        eyebrow="SMS SANDBOX · DEMO ONLY"
        title="Incident reports"
        subtitle="Try the inbound SMS flow, check a polling-unit code, and see the report appear on the dashboard. No real SMS is sent from the simulator."
      />
      <IncidentSandbox />
    </>
  );
}

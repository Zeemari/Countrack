/** Seeded demo accounts (SIMULATED). Shared by the seed script and the login picker. */
export const DEMO_USERS = [
  { email: "witness1@demo.countrack.test", role: "witness", name: "Witness 1" },
  { email: "witness2@demo.countrack.test", role: "witness", name: "Witness 2" },
  { email: "witness3@demo.countrack.test", role: "witness", name: "Witness 3" },
  { email: "agent1@demo.countrack.test", role: "agent", name: "Party Agent 1" },
  { email: "observer1@demo.countrack.test", role: "observer", name: "Observer 1" },
] as const;

export type DemoUser = (typeof DEMO_USERS)[number];
export const COLLATION_ROLES = ["agent", "observer"] as const;

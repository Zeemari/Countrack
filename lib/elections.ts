import { z } from "zod";

/**
 * The elections a polling unit can post a result sheet for, as INEC lists them on IReV.
 * Order = tab order. Chairmanship and councillorship are local government (area council) elections.
 */
export const ELECTIONS = [
  "presidential",
  "governorship",
  "senatorial",
  "house_of_reps",
  "state_assembly",
  "chairmanship",
  "councillorship",
] as const;
export const Election = z.enum(ELECTIONS);
export type Election = z.infer<typeof Election>;
export const DEFAULT_ELECTION: Election = "presidential";

/** Older links and queued captures used "local_government" before it was split in two. */
const LEGACY: Record<string, Election> = { local_government: "chairmanship" };

/** Reads an election from a query value, falling back to presidential. */
export const parseElection = (v: unknown): Election => {
  const parsed = Election.safeParse(typeof v === "string" ? (LEGACY[v] ?? v) : v);
  return parsed.success ? parsed.data : DEFAULT_ELECTION;
};

/** Link targets for link-mode election tabs, e.g. electionLinks((e) => `/units?election=${e}`). */
export const electionLinks = (f: (e: Election) => string) =>
  Object.fromEntries(ELECTIONS.map((e) => [e, f(e)])) as Record<Election, string>;

/** Plain-English name used in prompts and logs, e.g. "house of representatives". */
export const ELECTION_WORDS: Record<Election, string> = {
  presidential: "presidential",
  governorship: "governorship",
  senatorial: "senatorial",
  house_of_reps: "house of representatives",
  state_assembly: "state house of assembly",
  chairmanship: "local government chairmanship",
  councillorship: "councillorship",
};

/** Elections held state by state (everything except presidential). */
export const isStateScoped = (e: Election) => e !== "presidential";

import { Briefcase, Building, Building2, Gavel, House, Landmark, Users, type LucideIcon } from "lucide-react";
import type { Election } from "./elections";

/**
 * Each election's icon and solid colour (tokens in globals.css). Written out in full so Tailwind
 * sees every class name. Colours are light, so text on them uses text-e-ink in both themes.
 */
export const ELECTION_STYLE: Record<Election, { icon: LucideIcon; bg: string; text: string; ring: string }> = {
  presidential: { icon: Landmark, bg: "bg-e-pres", text: "text-e-pres", ring: "ring-e-pres" },
  governorship: { icon: Building2, bg: "bg-e-gov", text: "text-e-gov", ring: "ring-e-gov" },
  senatorial: { icon: Gavel, bg: "bg-e-sen", text: "text-e-sen", ring: "ring-e-sen" },
  house_of_reps: { icon: Users, bg: "bg-e-reps", text: "text-e-reps", ring: "ring-e-reps" },
  state_assembly: { icon: Building, bg: "bg-e-assembly", text: "text-e-assembly", ring: "ring-e-assembly" },
  chairmanship: { icon: Briefcase, bg: "bg-e-chair", text: "text-e-chair", ring: "ring-e-chair" },
  councillorship: { icon: House, bg: "bg-e-council", text: "text-e-council", ring: "ring-e-council" },
};

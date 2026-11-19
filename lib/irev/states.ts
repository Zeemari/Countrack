/**
 * IReV numbers states alphabetically (its `state_id`), which is NOT the INEC state code printed on
 * PVCs and in polling-unit codes: FCT is IReV state 15 but INEC code 37, and every state after
 * Enugu is shifted by one. Copied from the state list in IReV's own web bundle.
 */
export type IrevState = { name: string; code: string; irevId: number };

export const IREV_STATES: IrevState[] = [
  ["Abia", "01"], ["Adamawa", "02"], ["Akwa Ibom", "03"], ["Anambra", "04"], ["Bauchi", "05"],
  ["Bayelsa", "06"], ["Benue", "07"], ["Borno", "08"], ["Cross River", "09"], ["Delta", "10"],
  ["Ebonyi", "11"], ["Edo", "12"], ["Ekiti", "13"], ["Enugu", "14"], ["FCT", "37"],
  ["Gombe", "15"], ["Imo", "16"], ["Jigawa", "17"], ["Kaduna", "18"], ["Kano", "19"],
  ["Katsina", "20"], ["Kebbi", "21"], ["Kogi", "22"], ["Kwara", "23"], ["Lagos", "24"],
  ["Nasarawa", "25"], ["Niger", "26"], ["Ogun", "27"], ["Ondo", "28"], ["Osun", "29"],
  ["Oyo", "30"], ["Plateau", "31"], ["Rivers", "32"], ["Sokoto", "33"], ["Taraba", "34"],
  ["Yobe", "35"], ["Zamfara", "36"],
].map(([name, code], i) => ({ name, code, irevId: i + 1 }));

/** INEC state code ("24") → IReV state, or undefined. */
export const stateByCode = (code: string) => IREV_STATES.find((s) => s.code === code);

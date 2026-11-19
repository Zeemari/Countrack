/** Clean shapes CounTrack's /api/irev serves. IReV's own field names stay inside lib/irev/client.ts. */

export type IrevOption = { id: string; name: string; code?: string | null };

export type IrevElection = {
  id: string;
  name: string;
  /** ISO date (YYYY-MM-DD) when IReV gives one, else null. */
  date: string | null;
};

export type IrevUnit = {
  id: string;
  name: string;
  /** As IReV prints it, e.g. "24-05-03-012". */
  irevCode: string | null;
  /** Canonical "24/05/03/012" for matching CounTrack's polling units, or null. */
  code: string | null;
  /** Direct link to the uploaded EC8A image/PDF on INEC's storage, or null when nothing was uploaded. */
  documentUrl: string | null;
  isPdf: boolean;
  isSupplement: boolean;
  uploadedAt: string | null;
};

export type IrevListResponse<T> = { data: T[]; source: string };
export type IrevUnitResponse = { data: IrevUnit; election: IrevElection | null; source: string };

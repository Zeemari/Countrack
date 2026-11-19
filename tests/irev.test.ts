import { describe, expect, it } from "vitest";
import { electionOfType, matchesDate, toElections, toElectionTypes, toLgas, toUnits, toWards } from "@/lib/irev/map";
import { IREV_STATES, stateByCode } from "@/lib/irev/states";

const oid = (n: number) => n.toString(16).padStart(24, "0");

describe("IReV states", () => {
  it("keeps IReV's alphabetical ids apart from INEC codes", () => {
    expect(IREV_STATES).toHaveLength(37);
    expect(stateByCode("37")).toMatchObject({ name: "FCT", irevId: 15 });
    expect(stateByCode("24")).toMatchObject({ name: "Lagos", irevId: 25 });
    expect(stateByCode("01")).toMatchObject({ name: "Abia", irevId: 1 });
  });
});

describe("IReV mapping", () => {
  it("maps every election type, chairmanship before councillorship", () => {
    expect(electionOfType({ name: "Presidential", code: "PRES" })).toBe("presidential");
    expect(electionOfType({ name: "Governorship" })).toBe("governorship");
    expect(electionOfType({ name: "Senatorial District" })).toBe("senatorial");
    expect(electionOfType({ name: "House of Representatives" })).toBe("house_of_reps");
    expect(electionOfType({ name: "State House of Assembly" })).toBe("state_assembly");
    expect(electionOfType({ name: "FCT Area Council Chairmanship" })).toBe("chairmanship");
    expect(electionOfType({ name: "FCT Area Council Councillorship" })).toBe("councillorship");
    expect(electionOfType({ name: "Referendum" })).toBeNull();
  });

  it("reads election types and drops malformed rows", () => {
    const types = toElectionTypes({ success: true, data: [{ _id: oid(1), name: "Governorship", code: "GOV" }, { _id: "bad", name: "X" }, null] });
    expect(types).toEqual([{ id: oid(1), name: "Governorship", code: "GOV", election: "governorship" }]);
  });

  it("sorts elections newest first and filters by date or year", () => {
    const list = toElections({
      data: [
        { _id: oid(1), full_name: "2019 Presidential Election", election_date: "2019-02-23T00:00:00.000Z" },
        { _id: oid(2), full_name: "2023 Presidential Election", election_date: "2023-02-25T00:00:00.000Z" },
        { _id: oid(3), full_name: "2015 Presidential Election" },
      ],
    });
    expect(list.map((e) => e.date)).toEqual(["2023-02-25", "2019-02-23", null]);
    expect(list.filter((e) => matchesDate(e, "2023")).map((e) => e.id)).toEqual([oid(2)]);
    expect(list.filter((e) => matchesDate(e, "2015")).map((e) => e.id)).toEqual([oid(3)]);
    expect(list.filter((e) => matchesDate(e, null))).toHaveLength(3);
  });

  it("reads LGAs from their wrapper and wards from either place", () => {
    expect(toLgas({ data: [{ lga: { _id: oid(2), name: "Ikeja", code: "05" } }, { lga: { _id: oid(1), name: "Agege" } }] }).map((o) => o.name)).toEqual(["Agege", "Ikeja"]);
    expect(toWards({ data: { lga: {}, wards: [{ _id: oid(3), name: "Ward 03" }] } })).toEqual([{ id: oid(3), name: "Ward 03", code: null }]);
    expect(toWards({ data: [], wards: [{ _id: oid(4), name: "Ward 04" }] })).toHaveLength(1);
  });

  it("reads polling units, matches codes and resolves document URLs", () => {
    const units = toUnits({
      data: [
        { _id: oid(5), name: "Market Square", pu_code: "24-05-03-012", document: { url: "https://ecollation-result-docs.s3.eu-west-2.amazonaws.com/a.jpg", updated_at: "2023-02-25T15:00:00Z" } },
        { _id: oid(6), polling_unit: { name: "Old School", pu_code: "24-05-03-001" }, document: { document: "/b.pdf", is_supplement: true } },
        { _id: oid(7), name: "No Upload", pu_code: "24-05-03-002" },
        { _id: oid(8), name: "Bad Link", pu_code: "x", document: { url: "javascript:alert(1)" } },
      ],
    });
    const [first, second, third, fourth] = units;
    expect(first).toMatchObject({ code: "24/05/03/001", documentUrl: "https://etransmission-result-docs.s3.eu-west-2.amazonaws.com/b.pdf", isPdf: true, isSupplement: true });
    expect(second).toMatchObject({ code: "24/05/03/002", documentUrl: null, uploadedAt: null });
    expect(third).toMatchObject({ code: "24/05/03/012", isPdf: false, uploadedAt: "2023-02-25T15:00:00Z" });
    expect(fourth).toMatchObject({ code: null, documentUrl: null });
  });
});

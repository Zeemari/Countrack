import { describe, expect, it } from "vitest";
import { pageItems, pageWindow } from "@/lib/paginate";

describe("pagination", () => {
  it("lists every page when there are few", () => {
    expect(pageItems(1, 1)).toEqual([1]);
    expect(pageItems(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("collapses the middle with gaps", () => {
    expect(pageItems(10, 20)).toEqual([1, "gap", 9, 10, 11, "gap", 20]);
    expect(pageItems(1, 20)).toEqual([1, 2, 3, 4, 5, "gap", 20]);
    expect(pageItems(20, 20)).toEqual([1, "gap", 16, 17, 18, 19, 20]);
  });

  it("clamps pages and slices", () => {
    expect(pageWindow(1, 12, 30)).toEqual({ current: 1, pageCount: 3, start: 0, end: 12 });
    expect(pageWindow(9, 12, 30)).toEqual({ current: 3, pageCount: 3, start: 24, end: 30 });
    expect(pageWindow(0, 12, 0)).toEqual({ current: 1, pageCount: 1, start: 0, end: 0 });
  });
});

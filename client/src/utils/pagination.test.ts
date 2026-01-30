/**
 * Tests pour les utilitaires de pagination
 */

import { describe, it, expect } from "vitest";
import { paginateItems, getPageForIndex, getPageRange } from "./pagination";

describe("paginateItems", () => {
  const mockItems = Array.from({ length: 50 }, (_, i) => ({
    id: i + 1,
    name: `Item ${i + 1}`,
  }));

  it("should paginate items correctly for first page", () => {
    const result = paginateItems(mockItems, 1, 20);

    expect(result.items).toHaveLength(20);
    expect(result.items[0].id).toBe(1);
    expect(result.items[19].id).toBe(20);
    expect(result.currentPage).toBe(1);
    expect(result.totalPages).toBe(3);
    expect(result.totalItems).toBe(50);
    expect(result.hasNextPage).toBe(true);
    expect(result.hasPreviousPage).toBe(false);
  });

  it("should paginate items correctly for middle page", () => {
    const result = paginateItems(mockItems, 2, 20);

    expect(result.items).toHaveLength(20);
    expect(result.items[0].id).toBe(21);
    expect(result.items[19].id).toBe(40);
    expect(result.currentPage).toBe(2);
    expect(result.totalPages).toBe(3);
    expect(result.hasNextPage).toBe(true);
    expect(result.hasPreviousPage).toBe(true);
  });

  it("should paginate items correctly for last page", () => {
    const result = paginateItems(mockItems, 3, 20);

    expect(result.items).toHaveLength(10);
    expect(result.items[0].id).toBe(41);
    expect(result.items[9].id).toBe(50);
    expect(result.currentPage).toBe(3);
    expect(result.totalPages).toBe(3);
    expect(result.hasNextPage).toBe(false);
    expect(result.hasPreviousPage).toBe(true);
  });

  it("should handle empty array", () => {
    const result = paginateItems([], 1, 20);

    expect(result.items).toHaveLength(0);
    expect(result.currentPage).toBe(1);
    expect(result.totalPages).toBe(1);
    expect(result.totalItems).toBe(0);
    expect(result.hasNextPage).toBe(false);
    expect(result.hasPreviousPage).toBe(false);
  });

  it("should handle page number out of bounds (too high)", () => {
    const result = paginateItems(mockItems, 10, 20);

    expect(result.currentPage).toBe(3); // Should clamp to last page
    expect(result.items).toHaveLength(10);
  });

  it("should handle page number out of bounds (too low)", () => {
    const result = paginateItems(mockItems, 0, 20);

    expect(result.currentPage).toBe(1); // Should clamp to first page
    expect(result.items).toHaveLength(20);
  });

  it("should handle custom items per page", () => {
    const result = paginateItems(mockItems, 1, 10);

    expect(result.items).toHaveLength(10);
    expect(result.totalPages).toBe(5);
  });
});

describe("getPageForIndex", () => {
  it("should return correct page for index 0", () => {
    expect(getPageForIndex(0, 20)).toBe(1);
  });

  it("should return correct page for index 19", () => {
    expect(getPageForIndex(19, 20)).toBe(1);
  });

  it("should return correct page for index 20", () => {
    expect(getPageForIndex(20, 20)).toBe(2);
  });

  it("should return correct page for index 40", () => {
    expect(getPageForIndex(40, 20)).toBe(3);
  });

  it("should handle custom items per page", () => {
    expect(getPageForIndex(25, 10)).toBe(3);
  });
});

describe("getPageRange", () => {
  it("should return correct range for page 1", () => {
    const range = getPageRange(1, 20);
    expect(range.start).toBe(0);
    expect(range.end).toBe(20);
  });

  it("should return correct range for page 2", () => {
    const range = getPageRange(2, 20);
    expect(range.start).toBe(20);
    expect(range.end).toBe(40);
  });

  it("should return correct range for page 3", () => {
    const range = getPageRange(3, 20);
    expect(range.start).toBe(40);
    expect(range.end).toBe(60);
  });

  it("should handle custom items per page", () => {
    const range = getPageRange(2, 10);
    expect(range.start).toBe(10);
    expect(range.end).toBe(20);
  });
});

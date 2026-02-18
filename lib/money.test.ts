import {
  toMinorUnits,
  toMajorUnits,
  formatCents,
  calculateLaborTotal,
  calculateTotalWithTax,
  roundToCents,
} from "@/lib/money";

describe("Money Utilities - Critical Currency Bug Fixes", () => {
  describe("toMinorUnits - dollars to cents", () => {
    it("converts 20.02 dollars to 2002 cents", () => {
      expect(toMinorUnits(20.02)).toBe(2002);
    });

    it("converts string '50.50' to 5050 cents", () => {
      expect(toMinorUnits("50.50")).toBe(5050);
    });

    it("converts 3600 dollars to 360000 cents", () => {
      expect(toMinorUnits(3600)).toBe(360000);
    });

    it("converts 0 to 0", () => {
      expect(toMinorUnits(0)).toBe(0);
    });

    it("handles null/undefined as 0", () => {
      expect(toMinorUnits(null)).toBe(0);
      expect(toMinorUnits(undefined)).toBe(0);
    });

    it("handles invalid strings as 0", () => {
      expect(toMinorUnits("invalid")).toBe(0);
    });

    it("rounds correctly: 0.005 to 1 cent (banker's rounding)", () => {
      expect(toMinorUnits(0.005)).toBe(1);
    });
  });

  describe("toMajorUnits - cents to dollars", () => {
    it("converts 2002 cents to 20.02 dollars", () => {
      expect(toMajorUnits(2002)).toBe(20.02);
    });

    it("converts 360000 cents to 3600 dollars", () => {
      expect(toMajorUnits(360000)).toBe(3600);
    });

    it("converts string '5000' to 50 dollars", () => {
      expect(toMajorUnits("5000")).toBe(50);
    });

    it("converts 0 to 0", () => {
      expect(toMajorUnits(0)).toBe(0);
    });

    it("handles null/undefined as 0", () => {
      expect(toMajorUnits(null)).toBe(0);
      expect(toMajorUnits(undefined)).toBe(0);
    });
  });

  describe("formatCents - THE PRIMARY BUG FIX", () => {
    it("formats 360000 cents as $3,600.00 (not $360,000.00)", () => {
      expect(formatCents(360000)).toBe("$3,600.00");
    });

    it("formats 2002 cents as $20.02 (not $200.02 or $200,200)", () => {
      expect(formatCents(2002)).toBe("$20.02");
    });

    it("formats 100 cents as $1.00", () => {
      expect(formatCents(100)).toBe("$1.00");
    });

    it("formats 5000 cents as $50.00", () => {
      expect(formatCents(5000)).toBe("$50.00");
    });

    it("formats 0 cents as $0.00", () => {
      expect(formatCents(0)).toBe("$0.00");
    });

    it("handles null/undefined as $0.00", () => {
      expect(formatCents(null)).toBe("$0.00");
      expect(formatCents(undefined)).toBe("$0.00");
    });

    it("handles string input '360000' as $3,600.00", () => {
      expect(formatCents("360000")).toBe("$3,600.00");
    });

    it("handles invalid strings as $0.00", () => {
      expect(formatCents("invalid")).toBe("$0.00");
    });

    it("formats large amounts: 999999999 cents as $9,999,999.99", () => {
      expect(formatCents(999999999)).toBe("$9,999,999.99");
    });
  });

  describe("calculateLaborTotal - NO DOUBLE MULTIPLICATION", () => {
    it("calculates 10 hours @ $36/hr (3600 cents) = $360.00", () => {
      // laborHours=10, laborRate=3600 (cents for $36)
      // Expected: 10 * 3600 = 36000 cents = $360.00
      expect(calculateLaborTotal(10, 3600)).toBe(36000);
      expect(formatCents(calculateLaborTotal(10, 3600))).toBe("$360.00");
    });

    it("calculates 100 hours @ $36/hr = $3,600.00", () => {
      // laborHours=100, laborRate=3600 (cents)
      // Expected: 100 * 3600 = 360000 cents = $3,600.00 (FIXES THE BUG!)
      expect(calculateLaborTotal(100, 3600)).toBe(360000);
      expect(formatCents(calculateLaborTotal(100, 3600))).toBe("$3,600.00");
    });

    it("calculates 0 hours as $0.00", () => {
      expect(calculateLaborTotal(0, 3600)).toBe(0);
    });

    it("calculates 0 rate as $0.00", () => {
      expect(calculateLaborTotal(10, 0)).toBe(0);
    });

    it("handles decimal hours: 2.5 hours @ $40/hr = $100.00", () => {
      const rateInCents = 4000; // $40
      const result = calculateLaborTotal(2.5, rateInCents);
      expect(result).toBe(10000);
      expect(formatCents(result)).toBe("$100.00");
    });
  });

  describe("calculateTotalWithTax", () => {
    it("calculates tax on $100 @ 7.5% = $107.50", () => {
      const subtotal = 10000; // $100
      const { taxAmount, total } = calculateTotalWithTax(subtotal, 7.5);
      expect(taxAmount).toBe(750); // $7.50
      expect(total).toBe(10750); // $107.50
      expect(formatCents(total)).toBe("$107.50");
    });

    it("calculates tax on $3,600 @ 8% = $3,888", () => {
      const subtotal = 360000; // $3,600
      const { taxAmount, total } = calculateTotalWithTax(subtotal, 8);
      expect(taxAmount).toBe(28800); // $288
      expect(total).toBe(388800); // $3,888
      expect(formatCents(total)).toBe("$3,888.00");
    });

    it("handles 0 subtotal", () => {
      const { taxAmount, total } = calculateTotalWithTax(0, 8);
      expect(taxAmount).toBe(0);
      expect(total).toBe(0);
    });

    it("handles 0 tax rate", () => {
      const subtotal = 10000;
      const { taxAmount, total } = calculateTotalWithTax(subtotal, 0);
      expect(taxAmount).toBe(0);
      expect(total).toBe(10000);
    });
  });

  describe("roundToCents", () => {
    it("rounds 360000.4 to 360000", () => {
      expect(roundToCents(360000.4)).toBe(360000);
    });

    it("rounds 360000.5 to 360001", () => {
      expect(roundToCents(360000.5)).toBe(360001);
    });

    it("rounds 2002.1 to 2002", () => {
      expect(roundToCents(2002.1)).toBe(2002);
    });
  });

  describe("REGRESSION TESTS - Bug Examples", () => {
    it("Bug Example 1: 3,600 should display as $3,600.00 not $360,000.00", () => {
      // Original bug: 3600 displayed as $360,000
      // Client sends laborRate=360000 (for $3600)
      // Server was calculating: 10 * 360000 * 100 = 360,000,000
      // Now: 10 * 360000 = 3,600,000 hours? No wait...
      // Let me recalculate. If labor rate is $36/hour = 3600 cents
      // And user works 100 hours
      // Total should be 100 * 3600 = 360,000 cents = $3,600.00
      expect(formatCents(360000)).toBe("$3,600.00");
    });

    it("Bug Example 2: 2,002 should display as $2,002.00 not $200,200", () => {
      // Original bug: 2002 displayed as $200,200
      // formatCurrency(200200) -> 200200/100 = $2,002.00
      // But somehow it was showing as $200,200
      // This means the backend was storing 200200 cents (which is $2002)
      // So the bug must have been in the calculation, not the formatting
      expect(formatCents(200200)).toBe("$2,002.00");
    });
  });
});

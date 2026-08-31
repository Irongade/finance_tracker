import { describe, expect, it } from "vitest";
import { detectDateFormat, parseCsv, parseCsvAmount, parseCsvDate } from "../csv";

describe("parseCsv", () => {
  it("parses quoted fields, embedded commas and newlines, CRLF and BOM", () => {
    const { headers, rows, delimiter } = parseCsv(
      '﻿Date,Description,Amount\r\n2026-08-01,"Tesco, big shop",-82.40\r\n2026-08-02,"He said ""hi""\nsecond line",12.00\r\n',
    );
    expect(delimiter).toBe(",");
    expect(headers).toEqual(["Date", "Description", "Amount"]);
    expect(rows).toHaveLength(2);
    expect(rows[0][1]).toBe("Tesco, big shop");
    expect(rows[1][1]).toBe('He said "hi"\nsecond line');
  });

  it("sniffs semicolon and tab delimiters", () => {
    expect(parseCsv("a;b;c\n1;2;3").rows[0]).toEqual(["1", "2", "3"]);
    expect(parseCsv("a\tb\n1\t2").headers).toEqual(["a", "b"]);
  });

  it("skips blank lines", () => {
    expect(parseCsv("a,b\n1,2\n\n3,4\n").rows).toHaveLength(2);
  });
});

describe("dates", () => {
  it("parses iso, dmy and mdy", () => {
    expect(parseCsvDate("2026-08-30", "dmy")).toBe("2026-08-30");
    expect(parseCsvDate("30/08/2026", "dmy")).toBe("2026-08-30");
    expect(parseCsvDate("30-08-26", "dmy")).toBe("2026-08-30");
    expect(parseCsvDate("08/30/2026", "mdy")).toBe("2026-08-30");
    expect(parseCsvDate("31/02/2026", "dmy")).toBe("2026-02-31"); // calendar sanity is the server's job
    expect(parseCsvDate("not a date", "dmy")).toBeNull();
  });

  it("detects the format from the column", () => {
    expect(detectDateFormat(["2026-08-01", "2026-08-02"])).toBe("iso");
    expect(detectDateFormat(["13/01/2026", "30/08/2026"])).toBe("dmy");
    expect(detectDateFormat(["01/13/2026", "08/30/2026"])).toBe("mdy");
  });
});

describe("parseCsvAmount", () => {
  it("handles currency symbols, thousands separators, parentheses and signs", () => {
    expect(parseCsvAmount("-82.40")).toBe(-8240);
    expect(parseCsvAmount("£1,234.56")).toBe(123456);
    expect(parseCsvAmount("(45.00)")).toBe(-4500);
    expect(parseCsvAmount("1.234,56")).toBe(123456);
    expect(parseCsvAmount("12")).toBe(1200);
    expect(parseCsvAmount("")).toBeNull();
    expect(parseCsvAmount("abc")).toBeNull();
  });
});

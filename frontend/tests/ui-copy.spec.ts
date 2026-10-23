import { test, expect } from "@playwright/test";
import { translateUi } from "../src/lib/ui-copy";

test("localizes interface copy while preserving names, units and source language", () => {
  expect(translateUi("Pemakaian hari ini", "en")).toBe("Today's usage");
  expect(translateUi("Volume (m³)", "en")).toBe("Volume (m³)");
  expect(translateUi("Memuat peta…", "en")).toBe("Loading map…");
  expect(translateUi("Menampilkan 2 dari 4 titik", "en")).toBe("Showing 2 of 4 points");
  expect(translateUi("Gedung Rektorat", "en")).toBe("Gedung Rektorat");
  expect(translateUi("  Pemakaian hari ini  ", "id")).toBe("  Pemakaian hari ini  ");
});

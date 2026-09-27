import { ICON_TABLE, lucideExport, phosphorVueName, remixName, VUE_ICON_PACKAGES } from "@tesserai/templates";
import { describe, expect, it } from "vitest";

// Every icon the templates and page specs draw, by meaning, exists in each library's Vue package
// under the name the Vue icon pass imports (as apps/builder/src/icons.test.ts checks React's).
describe("the icon table, in the Vue packages", () => {
  it("names only icons the packages export", async () => {
    const packages = {
      lucide: await import("@lucide/vue"),
      tabler: await import("@tabler/icons-vue"),
      phosphor: await import("@phosphor-icons/vue"),
      hugeicons: await import("@hugeicons/core-free-icons"),
      remix: await import("@remixicon/vue"),
    };
    expect(Object.keys(packages).sort()).toEqual(Object.keys(VUE_ICON_PACKAGES).sort());
    const missing: string[] = [];
    for (const [meaning, row] of Object.entries(ICON_TABLE)) {
      const names = {
        lucide: [lucideExport(meaning)],
        tabler: [row.tabler],
        phosphor: [phosphorVueName(row.phosphor)],
        hugeicons: [row.hugeicons],
        remix: [remixName(row, "regular"), remixName(row, "fill")],
      };
      for (const [library, list] of Object.entries(names)) for (const name of list) if (!(name in packages[library as keyof typeof packages])) missing.push(`${library}: ${name} (${meaning})`);
    }
    expect(missing).toEqual([]);
  });
});

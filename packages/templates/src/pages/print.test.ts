import { PRESETS } from "@tesserai/core";
import { describe, expect, it } from "vitest";
import { renderAll } from "../render";
import { pageCatalog } from "./catalog";
import { EXAMPLE_PAGES, EXAMPLE_SPECS } from "./examples";
import { checkPage, printPage } from "./print";
import { draftSpec, specBuilder } from "./spec";

const system = PRESETS[0]!.build();

describe("page specs", () => {
  it("names what's wrong with a spec by element", async () => {
    const files = await renderAll("base-ui", system, { format: false });
    const { add, spec } = specBuilder();
    const root = add("Page", {}, [add("Buton", { label: "x" }), add("Heading", { text: "" }), add("Button", { label: "Go", intent: "sparkly" })]);
    const printed = printPage(spec(root), system, files);
    expect(printed.problems).toEqual(['buton: there\'s no "Buton" in the catalog', "heading (Heading): text: Too small: expected string to have >=1 characters"]);
    // An option the system doesn't offer is dropped, not printed.
    expect(printed.source).toContain("<Button>Go</Button>");
    expect(printPage({ root: "a", elements: { a: { type: "Page", children: ["a"] } } }, system, files).problems[0]).toMatch(/contains itself/);
  });

  it("sets headings in the system's heading face, as its own components do", async () => {
    const files = await renderAll("base-ui", system, { format: false });
    const printed = printPage(EXAMPLE_SPECS["settings"](), system, files, "settings");
    expect(printed.source).toMatch(/<h1 className="font-heading [^"]*">Settings<\/h1>/);
  });

  it("uses what the system offers, and leaves out what it doesn't", async () => {
    const trimmed = { ...system, excluded: ["card"] };
    const files = await renderAll("radix", trimmed, { format: false });
    const printed = printPage(EXAMPLE_SPECS["sign-in"](), trimmed, files, "sign-in");
    expect(printed.missing).toEqual(["card"]);
    expect(printed.source).not.toContain("@/components/ui/card");
    expect(printed.source).toContain('placeholder="you@company.com"');
  });
});

describe("responsive by construction", () => {
  // Grids and columns answer to the room they have (container queries), never the screen: a
  // four-up grid beside a sidebar on a 1100px screen once got four 170px cards.
  it("lays grids and columns out by their container, and keeps fixed widths inside the screen", async () => {
    const files = await renderAll("base-ui", system, { format: false });
    const { add, spec } = specBuilder();
    const root = add("Page", { width: "xl" }, [
      add("Grid", { columns: 4 }, [add("Text", { text: "a" }), add("Text", { text: "b" })]),
      add("Columns", { split: "2:1" }, [add("Text", { text: "main" }), add("Text", { text: "side" })]),
      add("Row", { wrap: false }, [add("Text", { text: "x" })]),
      add("Input", { placeholder: "Search", width: "sm" }),
    ]);
    const printed = printPage(spec(root), system, files);
    expect(printed.problems).toEqual([]);
    const classes = [...printed.source.matchAll(/className="([^"]*)"/g)].map((m) => m[1]!);
    // The page's content is a container, and no layout switches columns by screen width.
    expect(classes.some((c) => c.includes("@container") && c.includes("max-w-7xl"))).toBe(true);
    expect(classes.filter((c) => /(^|\s)(sm|md|lg|xl):grid-cols-/.test(c))).toEqual([]);
    expect(classes).toContain("grid grid-cols-1 *:min-w-0 gap-4 @md:grid-cols-2 @3xl:grid-cols-4");
    expect(classes).toContain("grid grid-cols-1 items-start gap-6 @3xl:grid-cols-[2fr_1fr]");
    expect(classes.filter((c) => c === "@container flex min-w-0 flex-col gap-6")).toHaveLength(2);
    expect(classes.some((c) => c.includes("*:min-w-0") && c.startsWith("flex"))).toBe(true);
    expect(classes).toContain("w-64 max-w-full");
  });
});

describe("pageCatalog", () => {
  it("lists only included components, with this system's options", () => {
    const docs = pageCatalog({ ...system, excluded: ["card"] });
    expect(docs.find((d) => d.type === "Card")).toBeUndefined();
    const button = docs.find((d) => d.type === "Button")!;
    const props = button.props as { properties: Record<string, { enum?: string[] }> };
    expect(props.properties["variant"]?.enum).toEqual(system.components["button"]!.axes.variant!.enabled);
    expect(docs.find((d) => d.type === "Stack")?.component).toBeUndefined();
  });
});

describe("spec problems", () => {
  it("reports content where it doesn't go, instead of dropping it quietly", async () => {
    const files = await renderAll("base-ui", system, { format: false });
    const { add, spec } = specBuilder();
    const root = add("Page", {}, [
      add("Button", { label: "Go" }, [add("Badge", { label: "new" })]),
      add("Card", { title: "Hi" }, [], { footr: [add("Text", { text: "lost" })] }),
      add("TableRow", {}, [add("Text", { text: "a" })]),
      add("Table", { label: "T", columns: [{ label: "A" }] }, [add("Text", { text: "not a row" })]),
    ]);
    const printed = printPage(spec(root), system, files);
    expect(printed.problems).toEqual([
      "button (Button): takes no children",
      'card (Card): has no slot "footr" (slots: action, footer)',
      "table-row (TableRow): only goes in Table",
      "text-3 (Text): can't go in Table, which takes TableRow",
    ]);
    expect(printed.source).not.toContain("<row");
  });

  it("builds a left-out component's content as if it sat in the parent", async () => {
    const trimmed = { ...system, excluded: ["sidebar"] };
    const files = await renderAll("base-ui", trimmed, { format: false });
    const printed = printPage(EXAMPLE_SPECS.dashboard(), trimmed, files, "dashboard");
    expect(printed.missing).toEqual(["sidebar"]);
    // A full page again: its own background and height, not the inset's.
    expect(printed.source).toContain('<main className="bg-background');
  });

  it("a left-out table's rows don't complain", async () => {
    const trimmed = { ...system, excluded: ["table", "data-table"] };
    const files = await renderAll("base-ui", trimmed, { format: false });
    const printed = printPage(EXAMPLE_SPECS["data-list"](), trimmed, files, "data-list");
    expect(printed.problems).toEqual([]);
    expect(printed.missing).toContain("table");
  });
});

describe("checking and drafting pages from the AI", () => {
  it("checks a page without the generated files: problems by element, and left-out components", () => {
    for (const page of EXAMPLE_PAGES) expect(checkPage(EXAMPLE_SPECS[page](), system)).toEqual({ problems: [], missing: [] });
    const { add, spec } = specBuilder();
    const root = add("Page", {}, [add("Card", { title: "Filters" }, [add("Buton", { label: "x" })])]);
    expect(checkPage(spec(root), system).problems).toEqual(['buton: there\'s no "Buton" in the catalog']);
    expect(checkPage(spec(root), { ...system, excluded: ["card"] }).missing).toEqual(["card"]);
  });

  it("shows the part of a streaming spec that has arrived", () => {
    expect(draftSpec({ root: "page" })).toBeNull();
    expect(draftSpec({ root: "page", elements: { page: { type: "Pa" } } })).toEqual({ root: "page", elements: { page: { type: "Pa", props: {} } } });
    // Children not written yet are left out until they arrive; a half-written element is skipped.
    const partial = {
      root: "page",
      elements: {
        page: { type: "Page", props: {}, children: ["title", "card", "footer"] },
        title: { type: "Heading", props: { text: "Filt" } },
        card: { type: "Card", props: { title: "Status" }, children: ["title", "check"] },
        check: { props: { label: "Act" } },
      },
    };
    expect(draftSpec(partial)).toEqual({
      root: "page",
      elements: {
        page: { type: "Page", props: {}, children: ["title", "card"] },
        title: { type: "Heading", props: { text: "Filt" } },
        // "title" is already placed on the page, so the card's second reference to it is dropped.
        card: { type: "Card", props: { title: "Status" }, children: [] },
      },
    });
  });
});

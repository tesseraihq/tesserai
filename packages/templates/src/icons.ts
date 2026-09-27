import { customIconName, iconSettings, type DesignSystem, type Framework, type IconLibrary, type IconSettings } from "@tesserai/core";

// Icons in generated code. Templates draw Lucide icons by name (ChevronDownIcon); this pass turns
// each into the system's choice: its library (with the weight), a spot changed to another icon,
// or one of the system's own. The local name stays, so the components' JSX doesn't change; only
// the imports do (and, for libraries drawn through a wrapper, a one-line component per icon).

// Every icon the templates and page specs use, by meaning (Lucide's names), in each library.
// Checked against the real packages by apps/builder/src/icons.test.ts.
// Remix names take Line or Fill for the weight, except its editor icons (remixPlain), which have one.
export const ICON_TABLE: Record<string, { tabler: string; phosphor: string; hugeicons: string; remix: string; remixPlain?: true }> = {
  "arrow-down": { tabler: "IconArrowDown", phosphor: "ArrowDownIcon", hugeicons: "ArrowDown01Icon", remix: "RiArrowDown" },
  "arrow-right": { tabler: "IconArrowRight", phosphor: "ArrowRightIcon", hugeicons: "ArrowRight01Icon", remix: "RiArrowRight" },
  "arrow-up": { tabler: "IconArrowUp", phosphor: "ArrowUpIcon", hugeicons: "ArrowUp01Icon", remix: "RiArrowUp" },
  bell: { tabler: "IconBell", phosphor: "BellIcon", hugeicons: "Notification01Icon", remix: "RiNotification3" },
  calendar: { tabler: "IconCalendar", phosphor: "CalendarBlankIcon", hugeicons: "Calendar01Icon", remix: "RiCalendar" },
  "chart-column": { tabler: "IconChartBar", phosphor: "ChartBarIcon", hugeicons: "ChartColumnIcon", remix: "RiBarChart" },
  check: { tabler: "IconCheck", phosphor: "CheckIcon", hugeicons: "Tick02Icon", remix: "RiCheck" },
  "chevron-down": { tabler: "IconChevronDown", phosphor: "CaretDownIcon", hugeicons: "ArrowDown01Icon", remix: "RiArrowDownS" },
  "chevron-left": { tabler: "IconChevronLeft", phosphor: "CaretLeftIcon", hugeicons: "ArrowLeft01Icon", remix: "RiArrowLeftS" },
  "chevron-right": { tabler: "IconChevronRight", phosphor: "CaretRightIcon", hugeicons: "ArrowRight01Icon", remix: "RiArrowRightS" },
  "chevron-up": { tabler: "IconChevronUp", phosphor: "CaretUpIcon", hugeicons: "ArrowUp01Icon", remix: "RiArrowUpS" },
  "chevrons-up-down": { tabler: "IconSelector", phosphor: "CaretUpDownIcon", hugeicons: "UnfoldMoreIcon", remix: "RiExpandUpDown" },
  "circle-alert": { tabler: "IconAlertCircle", phosphor: "WarningCircleIcon", hugeicons: "AlertCircleIcon", remix: "RiErrorWarning" },
  "circle-check": { tabler: "IconCircleCheck", phosphor: "CheckCircleIcon", hugeicons: "CheckmarkCircle02Icon", remix: "RiCheckboxCircle" },
  circle: { tabler: "IconCircle", phosphor: "CircleIcon", hugeicons: "CircleIcon", remix: "RiCircle" },
  "credit-card": { tabler: "IconCreditCard", phosphor: "CreditCardIcon", hugeicons: "CreditCardIcon", remix: "RiBankCard" },
  download: { tabler: "IconDownload", phosphor: "DownloadSimpleIcon", hugeicons: "Download01Icon", remix: "RiDownload2" },
  ellipsis: { tabler: "IconDots", phosphor: "DotsThreeIcon", hugeicons: "MoreHorizontalIcon", remix: "RiMore" },
  "file-text": { tabler: "IconFileText", phosphor: "FileTextIcon", hugeicons: "File01Icon", remix: "RiFileText" },
  filter: { tabler: "IconFilter", phosphor: "FunnelIcon", hugeicons: "FilterIcon", remix: "RiFilter3" },
  folder: { tabler: "IconFolder", phosphor: "FolderIcon", hugeicons: "Folder01Icon", remix: "RiFolder" },
  home: { tabler: "IconHome", phosphor: "HouseIcon", hugeicons: "Home01Icon", remix: "RiHome" },
  inbox: { tabler: "IconInbox", phosphor: "TrayIcon", hugeicons: "InboxIcon", remix: "RiInbox" },
  info: { tabler: "IconInfoCircle", phosphor: "InfoIcon", hugeicons: "InformationCircleIcon", remix: "RiInformation" },
  layers: { tabler: "IconStack2", phosphor: "StackIcon", hugeicons: "Layers01Icon", remix: "RiStack" },
  "loader-2": { tabler: "IconLoader2", phosphor: "CircleNotchIcon", hugeicons: "Loading03Icon", remix: "RiLoader4" },
  "log-out": { tabler: "IconLogout", phosphor: "SignOutIcon", hugeicons: "Logout01Icon", remix: "RiLogoutBoxR" },
  mail: { tabler: "IconMail", phosphor: "EnvelopeIcon", hugeicons: "Mail01Icon", remix: "RiMail" },
  minus: { tabler: "IconMinus", phosphor: "MinusIcon", hugeicons: "MinusSignIcon", remix: "RiSubtract" },
  "more-horizontal": { tabler: "IconDots", phosphor: "DotsThreeIcon", hugeicons: "MoreHorizontalIcon", remix: "RiMore" },
  "octagon-x": { tabler: "IconAlertOctagon", phosphor: "XCircleIcon", hugeicons: "Cancel01Icon", remix: "RiCloseCircle" },
  "panel-left": { tabler: "IconLayoutSidebar", phosphor: "SidebarIcon", hugeicons: "SidebarLeftIcon", remix: "RiSideBar" },
  pencil: { tabler: "IconPencil", phosphor: "PencilSimpleIcon", hugeicons: "PencilEdit01Icon", remix: "RiPencil" },
  plus: { tabler: "IconPlus", phosphor: "PlusIcon", hugeicons: "PlusSignIcon", remix: "RiAdd" },
  search: { tabler: "IconSearch", phosphor: "MagnifyingGlassIcon", hugeicons: "Search01Icon", remix: "RiSearch" },
  settings: { tabler: "IconSettings", phosphor: "GearIcon", hugeicons: "Settings01Icon", remix: "RiSettings3" },
  "sliders-horizontal": { tabler: "IconAdjustmentsHorizontal", phosphor: "SlidersHorizontalIcon", hugeicons: "SlidersHorizontalIcon", remix: "RiEqualizer" },
  star: { tabler: "IconStar", phosphor: "StarIcon", hugeicons: "StarIcon", remix: "RiStar" },
  "trash-2": { tabler: "IconTrash", phosphor: "TrashIcon", hugeicons: "Delete02Icon", remix: "RiDeleteBin" },
  "triangle-alert": { tabler: "IconAlertTriangle", phosphor: "WarningIcon", hugeicons: "Alert02Icon", remix: "RiAlert" },
  user: { tabler: "IconUser", phosphor: "UserIcon", hugeicons: "UserIcon", remix: "RiUser" },
  users: { tabler: "IconUsers", phosphor: "UsersIcon", hugeicons: "UserGroupIcon", remix: "RiGroup" },
  x: { tabler: "IconX", phosphor: "XIcon", hugeicons: "Cancel01Icon", remix: "RiClose" },
  // Also drawn by the preview's own examples (Reply, Archive, text formatting…).
  "align-center": { tabler: "IconAlignCenter", phosphor: "TextAlignCenterIcon", hugeicons: "TextAlignCenterIcon", remix: "RiAlignCenter", remixPlain: true },
  "align-left": { tabler: "IconAlignLeft", phosphor: "TextAlignLeftIcon", hugeicons: "TextAlignLeftIcon", remix: "RiAlignLeft", remixPlain: true },
  "align-right": { tabler: "IconAlignRight", phosphor: "TextAlignRightIcon", hugeicons: "TextAlignRightIcon", remix: "RiAlignRight", remixPlain: true },
  archive: { tabler: "IconArchive", phosphor: "ArchiveIcon", hugeicons: "Archive01Icon", remix: "RiArchive" },
  "badge-check": { tabler: "IconRosetteDiscountCheck", phosphor: "SealCheckIcon", hugeicons: "CheckmarkBadge01Icon", remix: "RiVerifiedBadge" },
  bold: { tabler: "IconBold", phosphor: "TextBIcon", hugeicons: "TextBoldIcon", remix: "RiBold", remixPlain: true },
  calculator: { tabler: "IconCalculator", phosphor: "CalculatorIcon", hugeicons: "CalculatorIcon", remix: "RiCalculator" },
  copy: { tabler: "IconCopy", phosphor: "CopyIcon", hugeicons: "Copy01Icon", remix: "RiFileCopy" },
  italic: { tabler: "IconItalic", phosphor: "TextItalicIcon", hugeicons: "TextItalicIcon", remix: "RiItalic", remixPlain: true },
  reply: { tabler: "IconArrowBackUp", phosphor: "ArrowBendUpLeftIcon", hugeicons: "MailReply01Icon", remix: "RiReply" },
  smile: { tabler: "IconMoodSmile", phosphor: "SmileyIcon", hugeicons: "SmileIcon", remix: "RiEmotionHappy" },
  underline: { tabler: "IconUnderline", phosphor: "TextUnderlineIcon", hugeicons: "TextUnderlineIcon", remix: "RiUnderline", remixPlain: true },
};

// A table row's Remix export for a weight.
export function remixName(row: { remix: string; remixPlain?: true }, weight: string): string {
  return row.remixPlain ? row.remix : `${row.remix}${weight === "fill" ? "Fill" : "Line"}`;
}

export const ICON_PACKAGES: Record<IconLibrary, string> = {
  lucide: "lucide-react",
  tabler: "@tabler/icons-react",
  phosphor: "@phosphor-icons/react",
  hugeicons: "@hugeicons/core-free-icons",
  remix: "@remixicon/react",
};

// Lucide in each framework. The Vue and Svelte packages export the same names as lucide-react
// (XIcon, ChevronDownIcon), so templates name an icon the same way in all three; the other
// libraries' Vue and Svelte packages come with those frameworks' icon pass.
export const LUCIDE_PACKAGES: Record<Framework, string> = { react: "lucide-react", vue: "@lucide/vue", svelte: "@lucide/svelte" };

// What shadcn's components.json calls each library, for `npx @tesserai/cli init`.
export const SHADCN_ICON_LIBRARY: Record<IconLibrary, string> = { lucide: "lucide", tabler: "tabler", phosphor: "phosphor", hugeicons: "hugeicons", remix: "remixicon" };

// "ChevronDownIcon" -> "chevron-down"; "Loader2Icon" -> "loader-2".
export function meaningOf(lucideExport: string): string {
  return lucideExport.replace(/Icon$/, "").replace(/([a-z])([A-Z0-9])/g, "$1-$2").replace(/([0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

// "chevron-down" -> "ChevronDownIcon".
export function lucideExport(meaning: string): string {
  return `${meaning.split("-").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join("")}Icon`;
}

export type ResolvedIcon =
  // Imported under the name the code uses.
  | { kind: "import"; module: string; name: string }
  // Drawn through a one-line component: Phosphor with a weight, and Hugeicons, which draws icon data.
  | { kind: "phosphor"; name: string; weight: string }
  | { kind: "hugeicons"; name: string; stroke: number }
  | { kind: "custom"; id: string };

// Where an icon comes from, for a meaning or a spot's own reference.
export function resolveIcon(ref: string, settings: IconSettings): ResolvedIcon {
  if (ref.startsWith("custom:")) return { kind: "custom", id: ref.slice("custom:".length) };
  const colon = ref.indexOf(":");
  if (colon > 0) {
    const library = ref.slice(0, colon) as IconLibrary;
    const name = ref.slice(colon + 1);
    if (library === "phosphor" && settings.weight !== "regular") return { kind: "phosphor", name, weight: settings.weight };
    if (library === "hugeicons") return { kind: "hugeicons", name, stroke: settings.stroke };
    return { kind: "import", module: ICON_PACKAGES[library], name };
  }
  const row = ICON_TABLE[ref];
  // An icon only Lucide has (a meaning's icon picked by name) stays Lucide's.
  if (settings.library === "lucide" || row === undefined) return { kind: "import", module: "lucide-react", name: lucideExport(ref) };
  switch (settings.library) {
    case "tabler":
      return { kind: "import", module: ICON_PACKAGES.tabler, name: row.tabler };
    case "phosphor":
      return settings.weight === "regular" ? { kind: "import", module: ICON_PACKAGES.phosphor, name: row.phosphor } : { kind: "phosphor", name: row.phosphor, weight: settings.weight };
    case "hugeicons":
      return { kind: "hugeicons", name: row.hugeicons, stroke: settings.stroke };
    case "remix":
      return { kind: "import", module: ICON_PACKAGES.remix, name: remixName(row, settings.weight) };
  }
}

const IMPORT = /import\s*\{([^}]*)\}\s*from\s*"lucide-react";?\n?/g;

// Rewrites one generated file's Lucide imports for the system's icons. `component` names the file
// for spots ("select" for components/ui/select.tsx).
export function applyIcons(source: string, component: string, system: Pick<DesignSystem, "icons">): string {
  const settings = iconSettings(system);
  const names = [...source.matchAll(IMPORT)].flatMap((m) => (m[1] ?? "").split(",").map((n) => n.trim()).filter(Boolean));
  if (names.length === 0) return source;
  const untouched = settings.library === "lucide" && settings.stroke === 2 && Object.keys(settings.spots).every((k) => !k.startsWith(`${component}:`));
  if (untouched) return source;

  const imports = new Map<string, Map<string, string>>();
  const wrappers: string[] = [];
  const add = (module: string, exported: string, local: string) => {
    if (!imports.has(module)) imports.set(module, new Map());
    imports.get(module)!.set(local, exported);
  };
  let needsTypes = false;
  for (const local of names) {
    const meaning = meaningOf(local);
    const ref = settings.spots[`${component}:${meaning}`] ?? meaning;
    const icon = resolveIcon(ref, settings);
    switch (icon.kind) {
      case "import":
        add(icon.module, icon.name, local);
        break;
      case "custom":
        add("@/components/icons", customIconName(icon.id), local);
        break;
      case "phosphor": {
        const aliased = `Ph${icon.name}`;
        add(ICON_PACKAGES.phosphor, icon.name, aliased);
        needsTypes = true;
        wrappers.push(`const ${local} = (props: ComponentProps<typeof ${aliased}>) => <${aliased} weight="${icon.weight}" {...props} />;`);
        break;
      }
      case "hugeicons": {
        const aliased = `Hg${icon.name}`;
        add(ICON_PACKAGES.hugeicons, icon.name, aliased);
        add("@hugeicons/react", "HugeiconsIcon", "HugeiconsIcon");
        needsTypes = true;
        wrappers.push(`const ${local} = (props: Omit<ComponentProps<typeof HugeiconsIcon>, "icon">) => <HugeiconsIcon icon={${aliased}} strokeWidth={${icon.stroke}} {...props} />;`);
        break;
      }
    }
  }
  const lines = [...imports].map(([module, locals]) => {
    const specifiers = [...locals].map(([local, exported]) => (local === exported ? local : `${exported} as ${local}`)).sort();
    return `import { ${specifiers.join(", ")} } from "${module}";`;
  });
  if (needsTypes) lines.unshift(`import type { ComponentProps } from "react";`);
  // The new imports go where the first Lucide import was; the wrappers after the last import.
  let first = true;
  let out = source.replace(IMPORT, () => {
    if (!first) return "";
    first = false;
    return `${lines.join("\n")}\n`;
  });
  if (wrappers.length > 0) {
    const lastImport = [...out.matchAll(/^import\b[^;]*;\n?/gm)].at(-1);
    const at = lastImport === undefined ? 0 : lastImport.index! + lastImport[0].length;
    out = `${out.slice(0, at)}\n${wrappers.join("\n")}\n${out.slice(at)}`;
  }
  return out;
}

// JSX for a cleaned SVG: attribute names in camelCase, and the caller's props on the root.
function svgJsx(svg: string, extra: string): string {
  const camel = svg.replace(/ ([a-z]+(?:-[a-z]+)+)="/g, (_, name: string) => ` ${name.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase())}="`);
  return camel.replace(/^<svg([^>]*?)(\/?)>/, `<svg$1 ${extra}$2>`);
}

// components/icons.tsx: one component per icon of the system's own, sized like a 24px icon (wide
// ones keep their width), following the text color unless they have colors of their own. A dark
// version swaps in under .dark.
export function customIconsFile(system: Pick<DesignSystem, "icons">): { path: string; source: string } | null {
  const custom = Object.entries(iconSettings(system).custom);
  if (custom.length === 0) return null;
  const parts = custom.map(([id, icon]) => {
    const name = customIconName(id);
    const box = /viewBox="([^"]+)"/.exec(icon.svg)?.[1]?.split(" ").map(Number) ?? [0, 0, 24, 24];
    const width = Math.round((24 * box[2]!) / box[3]!);
    const size = `width={${width}} height={24}`;
    const body =
      icon.dark === undefined
        ? `  return ${svgJsx(icon.svg, `${size} {...props}`)};`
        : `  return (\n    <>\n      ${svgJsx(icon.svg, `${size} {...props} className={cn("dark:hidden", props.className)}`)}\n      ${svgJsx(icon.dark, `${size} {...props} className={cn("hidden dark:block", props.className)}`)}\n    </>\n  );`;
    return `// ${icon.name.replace(/[\r\n\u2028\u2029]/g, " ")}\nexport function ${name}(props: ComponentProps<"svg">) {\n${body}\n}`;
  });
  const usesCn = custom.some(([, icon]) => icon.dark !== undefined);
  const header = [`import type { ComponentProps } from "react";`, ...(usesCn ? [`import { cn } from "@/lib/utils";`] : [])].join("\n");
  return { path: "components/icons.tsx", source: `${header}\n\n${parts.join("\n\n")}\n` };
}

// The icon packages a system's code imports: its library, any library a spot takes an icon from,
// and Lucide for icons its library doesn't map (a meaning's own icon, picked by Lucide name).
export function iconPackages(system: Pick<DesignSystem, "icons" | "intents">): string[] {
  const settings = iconSettings(system);
  const packages = new Set<string>([ICON_PACKAGES[settings.library]]);
  if (settings.library === "hugeicons") packages.add("@hugeicons/react");
  for (const ref of Object.values(settings.spots)) {
    const library = ref.includes(":") && !ref.startsWith("custom:") ? (ref.split(":")[0] as IconLibrary) : null;
    if (library !== null) packages.add(ICON_PACKAGES[library]);
    if (library === "hugeicons") packages.add("@hugeicons/react");
    if (library === null && !ref.startsWith("custom:") && !(ref in ICON_TABLE)) packages.add("lucide-react");
  }
  if (settings.library !== "lucide" && Object.values(system.intents).some((i) => i.icon !== undefined && !(i.icon in ICON_TABLE))) packages.add("lucide-react");
  return [...packages];
}

// The packages one generated file imports from the icon libraries.
export function iconImportsOf(source: string): string[] {
  const known = new Set([...Object.values(ICON_PACKAGES), "@hugeicons/react"]);
  return [...new Set([...source.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]!).filter((p) => known.has(p)))];
}

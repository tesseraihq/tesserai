import type { Anatomy } from "@tesserai/core";
import { breadcrumbPieces } from "../breadcrumb";
import { LUCIDE_PACKAGES } from "../icons";
import { paginationPieces } from "../pagination";
import type { GeneratedFile } from "../render";
import { barrel, classList, folder, plain, staticClasses } from "./sfc";

// Breadcrumb and Pagination: plain markup, with Reka's Primitive where the React file takes asChild,
// so a link can be a RouterLink, NuxtLink or Inertia Link (as-child), or any element (as).

export function renderBreadcrumb(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = breadcrumbPieces(anatomy);
  const f = folder("breadcrumb");
  const root = f.file(
    "Breadcrumb",
    `import type { HTMLAttributes } from "vue";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();`,
    `<nav aria-label="breadcrumb" data-slot="breadcrumb" :class="props.class">
  <slot />
</nav>`,
  );
  const link = f.file(
    "BreadcrumbLink",
    `import type { PrimitiveProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { Primitive } from "reka-ui";
import { cn } from "@/lib/utils";

const props = withDefaults(defineProps<PrimitiveProps & { class?: HTMLAttributes["class"] }>(), { as: "a" });`,
    `<Primitive data-slot="breadcrumb-link" :as="as" :as-child="asChild" :class="cn(${classList(slots["breadcrumb-link"])}, props.class)">
  <slot />
</Primitive>`,
  );
  const separator = f.file(
    "BreadcrumbSeparator",
    `import type { HTMLAttributes } from "vue";
import { ChevronRightIcon } from "${LUCIDE_PACKAGES.vue}";
import { cn } from "@/lib/utils";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();`,
    `<li data-slot="breadcrumb-separator" role="presentation" aria-hidden="true" :class="cn(${classList(slots["breadcrumb-separator"])}, props.class)">
  <slot>
    <ChevronRightIcon />
  </slot>
</li>`,
  );
  const ellipsis = f.file(
    "BreadcrumbEllipsis",
    `import type { HTMLAttributes } from "vue";
import { MoreHorizontalIcon } from "${LUCIDE_PACKAGES.vue}";
import { cn } from "@/lib/utils";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();`,
    `<span data-slot="breadcrumb-ellipsis" role="presentation" aria-hidden="true" :class="cn(${classList(slots["breadcrumb-ellipsis"])}, props.class)">
  <slot>
    <MoreHorizontalIcon />
  </slot>
  <span class="sr-only">More</span>
</span>`,
  );
  return [
    root,
    plain(f, "BreadcrumbList", "ol", "breadcrumb-list", classList(slots["breadcrumb-list"])),
    plain(f, "BreadcrumbItem", "li", "breadcrumb-item", classList(slots["breadcrumb-item"])),
    link,
    plain(f, "BreadcrumbPage", "span", "breadcrumb-page", classList(slots["breadcrumb-page"]), `role="link" aria-disabled="true" aria-current="page"`),
    separator,
    ellipsis,
    barrel("breadcrumb", ["Breadcrumb", "BreadcrumbEllipsis", "BreadcrumbItem", "BreadcrumbLink", "BreadcrumbList", "BreadcrumbPage", "BreadcrumbSeparator"]),
  ];
}

// Pagination as links (href, or as-child for a router's link), each the system's Button: ghost,
// outline for the current page. The same parts and markup as the React file.
export function renderPagination(anatomy: Anatomy): GeneratedFile[] {
  const { slots, link } = paginationPieces(anatomy);
  const f = folder("pagination");
  const linkProps = `PrimitiveProps & { class?: HTMLAttributes["class"]; isActive?: boolean; size?: ButtonVariantProps["size"] }`;
  const paginationLink = f.file(
    "PaginationLink",
    `import type { PrimitiveProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import type { ButtonVariantProps } from "@/components/ui/button";
import { Button } from "@/components/ui/button";

const props = withDefaults(defineProps<${linkProps}>(), { as: "a", size: "${link.size}", isActive: undefined });`,
    `<Button
  :as="as"
  :as-child="asChild"
  :variant="isActive ? '${link.activeVariant}' : '${link.variant}'"
  :size="size"
  :class="props.class"
  :aria-current="isActive ? 'page' : undefined"
  data-slot="pagination-link"
  :data-active="isActive"
>
  <slot />
</Button>`,
  );
  const edge = (name: "Previous" | "Next") => {
    const icon = name === "Previous" ? `<ChevronLeftIcon data-icon="inline-start" ${staticClasses(slots["pagination-link:icon"])} />` : `<ChevronRightIcon data-icon="inline-end" ${staticClasses(slots["pagination-link:icon"])} />`;
    const label = `<span ${staticClasses(slots["pagination-link:label"])}>{{ text }}</span>`;
    return f.file(
      `Pagination${name}`,
      `import type { PrimitiveProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import type { ButtonVariantProps } from "@/components/ui/button";
import { ${name === "Previous" ? "ChevronLeftIcon" : "ChevronRightIcon"} } from "${LUCIDE_PACKAGES.vue}";
import { cn } from "@/lib/utils";
import PaginationLink from "./PaginationLink.vue";

const props = withDefaults(defineProps<${linkProps} & { text?: string }>(), { as: "a", size: "${link.edgeSize}", isActive: undefined, text: "${name}" });`,
      `<PaginationLink
  aria-label="Go to ${name === "Previous" ? "previous" : "next"} page"
  :as="as"
  :as-child="asChild"
  :is-active="isActive"
  :size="size"
  :class="cn(${classList(slots[name === "Previous" ? "pagination-link:previous" : "pagination-link:next"])}, props.class)"
>
  ${name === "Previous" ? `${icon}\n  ${label}` : `${label}\n  ${icon}`}
</PaginationLink>`,
    );
  };
  const ellipsis = f.file(
    "PaginationEllipsis",
    `import type { HTMLAttributes } from "vue";
import { MoreHorizontalIcon } from "${LUCIDE_PACKAGES.vue}";
import { cn } from "@/lib/utils";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();`,
    `<span aria-hidden="true" data-slot="pagination-ellipsis" :class="cn(${classList(slots["pagination-ellipsis"])}, props.class)">
  <slot>
    <MoreHorizontalIcon />
  </slot>
  <span class="sr-only">More pages</span>
</span>`,
  );
  const item = plain(f, "PaginationItem", "li", "pagination-item", classList(slots["pagination-item"]));
  return [
    plain(f, "Pagination", "nav", "pagination", classList(slots.pagination), `role="navigation" aria-label="pagination"`),
    plain(f, "PaginationContent", "ul", "pagination-content", classList(slots["pagination-content"])),
    ellipsis,
    item,
    paginationLink,
    edge("Next"),
    edge("Previous"),
    barrel("pagination", ["Pagination", "PaginationContent", "PaginationEllipsis", "PaginationItem", "PaginationLink", "PaginationNext", "PaginationPrevious"]),
  ];
}

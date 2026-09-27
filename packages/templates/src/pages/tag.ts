// In the builder's preview each element of a page carries its type and key, so inspect mode can
// select a Stack or Row the way it selects a component. Only the preview's copy: the code a page
// hands over has none (untagPage).
export const PAGE_TAG = "data-tesserai-el";

export const pageTag = (type: string, key: string) => `${type}#${key.replace(/[^\w-]/g, "-")}`;

export const untagPage = (source: string) => source.replace(new RegExp(`\\s+${PAGE_TAG}="[^"]*"`, "g"), "");

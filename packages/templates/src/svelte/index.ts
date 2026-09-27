import type { FilesTemplate } from "../render";
import { buttonFiles } from "./button";
import { attachmentFiles, bubbleFiles, markerFiles, messageFiles } from "./chat";
import { dataTableFiles } from "./data-table";
import { calendarFiles, datePickerFiles } from "./calendar";
import { dialogFiles } from "./dialog";
import { alertFiles, avatarFiles, badgeFiles, cardFiles, kbdFiles, progressFiles, separatorFiles, skeletonFiles, spinnerFiles, tableFiles, typographyFiles } from "./display";
import { checkboxFiles, fieldFiles, inputFiles, labelFiles, nativeSelectFiles, radioGroupFiles, sliderFiles, switchFiles, textareaFiles } from "./forms";
import { alertDialogFiles, sheetFiles } from "./modal";
import { accordionFiles, breadcrumbFiles, collapsibleFiles, paginationFiles, tabsFiles } from "./navigation";
import { dropdownMenuFiles, popoverFiles, selectFiles, tooltipFiles } from "./popups";
import { toggleFiles, toggleGroupFiles } from "./toggle";
import { buttonGroupFiles, emptyFiles, inputGroupFiles, inputOtpFiles, itemFiles } from "./groups";
import { aspectRatioFiles, resizableFiles, scrollAreaFiles } from "./layout";
import { carouselFiles } from "./carousel";
import { sidebarFiles } from "./sidebar";
import { comboboxFiles } from "./combobox";
import { commandFiles } from "./command";
import { contextMenuFiles, menubarFiles } from "./menus";
import { navigationMenuFiles } from "./navigation-menu";
import { drawerFiles, hoverCardFiles } from "./overlays";
import { sonnerFiles } from "./sonner";
import { toastFiles } from "./toast";
import { chartFiles } from "./chart";
import { messageScrollerFiles } from "./message-scroller";
import { questionnaireFiles } from "./questionnaire";

// Svelte 5 components on Bits UI, by component name. Each is a folder of .svelte files and an
// index.ts, laid out as shadcn-svelte does. See docs/frameworks/svelte.md.
export const SVELTE_TEMPLATES: Record<string, FilesTemplate> = {
  button: buttonFiles,
  badge: badgeFiles,
  input: inputFiles,
  textarea: textareaFiles,
  label: labelFiles,
  field: fieldFiles,
  checkbox: checkboxFiles,
  switch: switchFiles,
  "radio-group": radioGroupFiles,
  select: selectFiles,
  "native-select": nativeSelectFiles,
  card: cardFiles,
  separator: separatorFiles,
  skeleton: skeletonFiles,
  spinner: spinnerFiles,
  kbd: kbdFiles,
  alert: alertFiles,
  avatar: avatarFiles,
  typography: typographyFiles,
  table: tableFiles,
  tabs: tabsFiles,
  accordion: accordionFiles,
  collapsible: collapsibleFiles,
  toggle: toggleFiles,
  "toggle-group": toggleGroupFiles,
  tooltip: tooltipFiles,
  popover: popoverFiles,
  dialog: dialogFiles,
  "alert-dialog": alertDialogFiles,
  sheet: sheetFiles,
  "dropdown-menu": dropdownMenuFiles,
  progress: progressFiles,
  slider: sliderFiles,
  breadcrumb: breadcrumbFiles,
  pagination: paginationFiles,
  "aspect-ratio": aspectRatioFiles,
  "button-group": buttonGroupFiles,
  empty: emptyFiles,
  item: itemFiles,
  "input-group": inputGroupFiles,
  "input-otp": inputOtpFiles,
  "scroll-area": scrollAreaFiles,
  resizable: resizableFiles,
  sidebar: sidebarFiles,
  carousel: carouselFiles,
  // direction: Bits UI has no direction provider (each part takes its own dir), and shadcn-svelte
  // has no direction component; see docs/frameworks.
  message: messageFiles,
  bubble: bubbleFiles,
  attachment: attachmentFiles,
  marker: markerFiles,
  "data-table": dataTableFiles,
  calendar: calendarFiles,
  "date-picker": datePickerFiles,
  // Menus, overlays, pickers and toasts.
  "context-menu": contextMenuFiles,
  menubar: menubarFiles,
  "hover-card": hoverCardFiles,
  drawer: drawerFiles,
  command: commandFiles,
  combobox: comboboxFiles,
  "navigation-menu": navigationMenuFiles,
  toast: toastFiles,
  sonner: sonnerFiles,
  // The long tail: the chart (on LayerChart) and the chat components with behaviour of their own.
  chart: chartFiles,
  "message-scroller": messageScrollerFiles,
  questionnaire: questionnaireFiles,
};

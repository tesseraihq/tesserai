import type { FilesTemplate } from "../render";
import { renderBadge } from "./badge";
import { renderButton } from "./button";
import { renderCalendar, renderDatePicker } from "./calendar";
import { renderAttachment, renderBubble, renderMarker, renderMessage } from "./chat";
import { renderDataTable } from "./data-table";
import { renderCheckbox, renderRadioGroup, renderSwitch } from "./controls";
import { renderDialog } from "./dialog";
import { renderAlert, renderAvatar, renderCard, renderKbd, renderProgress, renderSeparator, renderSkeleton, renderSpinner, renderTable, renderTypography } from "./display";
import { renderDropdownMenu } from "./dropdown-menu";
import { renderField, renderInput, renderLabel, renderNativeSelect, renderTextarea } from "./form";
import { renderAlertDialog, renderSheet } from "./modal";
import { renderBreadcrumb, renderPagination } from "./navigation";
import { renderPopover, renderTooltip } from "./popups";
import { renderHoverCard } from "./popups";
import { renderCombobox } from "./combobox";
import { renderCommand } from "./command";
import { renderDrawer } from "./drawer";
import { renderContextMenu, renderMenubar } from "./menus";
import { renderNavigationMenu } from "./navigation-menu";
import { renderSonner } from "./sonner";
import { renderToast } from "./toast";
import { renderSelect } from "./select";
import { renderSlider } from "./slider";
import { renderAccordion, renderCollapsible, renderTabs, renderToggle, renderToggleGroup } from "./tabs";
import { renderButtonGroup, renderEmpty, renderInputGroup, renderInputOtp, renderItem } from "./groups";
import { renderAspectRatio, renderDirection, renderResizable, renderScrollArea } from "./layout";
import { renderCarousel } from "./carousel";
import { renderSidebar } from "./sidebar";
import { renderChart } from "./chart";
import { renderMessageScroller } from "./message-scroller";
import { renderQuestionnaire } from "./questionnaire";

// Vue components on Reka UI, by component name. Each is a folder of single-file components and an
// index.ts, laid out as shadcn-vue does. See docs/frameworks/vue.md.
export const VUE_TEMPLATES: Record<string, FilesTemplate> = {
  accordion: renderAccordion,
  alert: renderAlert,
  "alert-dialog": renderAlertDialog,
  attachment: renderAttachment,
  avatar: renderAvatar,
  badge: renderBadge,
  breadcrumb: renderBreadcrumb,
  bubble: renderBubble,
  button: renderButton,
  calendar: renderCalendar,
  card: renderCard,
  checkbox: renderCheckbox,
  collapsible: renderCollapsible,
  "data-table": renderDataTable,
  "date-picker": renderDatePicker,
  dialog: renderDialog,
  "dropdown-menu": renderDropdownMenu,
  field: renderField,
  input: renderInput,
  kbd: renderKbd,
  label: renderLabel,
  marker: renderMarker,
  message: renderMessage,
  "native-select": renderNativeSelect,
  pagination: renderPagination,
  popover: renderPopover,
  progress: renderProgress,
  "radio-group": renderRadioGroup,
  select: renderSelect,
  separator: renderSeparator,
  sheet: renderSheet,
  skeleton: renderSkeleton,
  slider: renderSlider,
  spinner: renderSpinner,
  switch: renderSwitch,
  table: renderTable,
  tabs: renderTabs,
  textarea: renderTextarea,
  toggle: renderToggle,
  "toggle-group": renderToggleGroup,
  tooltip: renderTooltip,
  typography: renderTypography,
  "aspect-ratio": renderAspectRatio,
  "button-group": renderButtonGroup,
  empty: renderEmpty,
  item: renderItem,
  "input-group": renderInputGroup,
  "input-otp": renderInputOtp,
  "scroll-area": renderScrollArea,
  resizable: renderResizable,
  direction: renderDirection,
  sidebar: renderSidebar,
  carousel: renderCarousel,
  // Menus, overlays, pickers and toasts.
  "context-menu": renderContextMenu,
  menubar: renderMenubar,
  "hover-card": renderHoverCard,
  drawer: renderDrawer,
  command: renderCommand,
  combobox: renderCombobox,
  "navigation-menu": renderNavigationMenu,
  toast: renderToast,
  sonner: renderSonner,
  // The long tail: the chart (on Unovis) and the chat components with behaviour of their own.
  chart: renderChart,
  "message-scroller": renderMessageScroller,
  questionnaire: renderQuestionnaire,
};

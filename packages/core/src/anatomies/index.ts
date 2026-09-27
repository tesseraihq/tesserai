import type { Anatomy } from "../components";
import { button } from "./button";
import { badge } from "./badge";
import { input } from "./input";
import { checkbox } from "./checkbox";
import { card } from "./card";
import { dialog } from "./dialog";
import { select } from "./select";
import { dropdownMenu } from "./dropdown-menu";
import { tabs } from "./tabs";
import { table } from "./table";
import { toast } from "./toast";
import { tooltip } from "./tooltip";
import { label } from "./label";
import { textarea } from "./textarea";
import { nativeSelect } from "./native-select";
import { radioGroup } from "./radio-group";
import { slider } from "./slider";
import { switchAnatomy } from "./switch";
import { popover } from "./popover";
import { hoverCard } from "./hover-card";
import { alertDialog } from "./alert-dialog";
import { sheet } from "./sheet";
import { contextMenu } from "./context-menu";
import { menubar } from "./menubar";
import { combobox } from "./combobox";
import { sonner } from "./sonner";
import { accordion } from "./accordion";
import { collapsible } from "./collapsible";
import { breadcrumb } from "./breadcrumb";
import { pagination } from "./pagination";
import { scrollArea } from "./scroll-area";
import { navigationMenu } from "./navigation-menu";
import { alert } from "./alert";
import { avatar } from "./avatar";
import { aspectRatio } from "./aspect-ratio";
import { skeleton } from "./skeleton";
import { spinner } from "./spinner";
import { progress } from "./progress";
import { separator } from "./separator";
import { kbd } from "./kbd";
import { empty } from "./empty";
import { item } from "./item";
import { buttonGroup } from "./button-group";
import { typography } from "./typography";
import { resizable } from "./resizable";
import { carousel } from "./carousel";
import { chart } from "./chart";
import { calendar } from "./calendar";
import { datePicker } from "./date-picker";
import { dataTable } from "./data-table";
import { message } from "./message";
import { bubble } from "./bubble";
import { attachment } from "./attachment";
import { marker } from "./marker";
import { messageScroller } from "./message-scroller";
import { questionnaire } from "./questionnaire";
import { sidebar } from "./sidebar";
import { direction } from "./direction";
import { command } from "./command";
import { drawer } from "./drawer";
import { field } from "./field";
import { inputGroup } from "./input-group";
import { inputOtp } from "./input-otp";
import { toggle } from "./toggle";
import { toggleGroup } from "./toggle-group";

export { direction, sidebar, message, bubble, attachment, marker, messageScroller, questionnaire, dataTable, datePicker, calendar, chart, carousel, resizable, alert, avatar, aspectRatio, skeleton, spinner, progress, separator, kbd, empty, item, buttonGroup, typography, navigationMenu, scrollArea, pagination, breadcrumb, accordion, collapsible, sonner, combobox, command, drawer, popover, hoverCard, alertDialog, sheet, contextMenu, menubar, inputOtp, inputGroup, field, toggle, toggleGroup, label, textarea, nativeSelect, radioGroup, slider, switchAnatomy, button, badge, input, checkbox, card, dialog, select, dropdownMenu, tabs, table, toast, tooltip };

// Every component tesserai ships, by name. One file per component keeps each one reviewable.
export const DEFAULT_ANATOMIES: Record<string, Anatomy> = {
  button,
  badge,
  input,
  checkbox,
  card,
  dialog,
  select,
  "dropdown-menu": dropdownMenu,
  tabs,
  table,
  toast,
  tooltip,
  label,
  textarea,
  "native-select": nativeSelect,
  switch: switchAnatomy,
  "radio-group": radioGroup,
  slider,
  toggle,
  "toggle-group": toggleGroup,
  field,
  "input-group": inputGroup,
  "input-otp": inputOtp,
  drawer,
  "popover": popover,
  "hover-card": hoverCard,
  "alert-dialog": alertDialog,
  "sheet": sheet,
  "context-menu": contextMenu,
  "menubar": menubar,
  command,
  combobox,
  sonner,
  accordion,
  collapsible,
  breadcrumb,
  pagination,
  "scroll-area": scrollArea,
  "navigation-menu": navigationMenu,
  alert: alert,
  avatar: avatar,
  "aspect-ratio": aspectRatio,
  skeleton: skeleton,
  spinner: spinner,
  progress: progress,
  separator: separator,
  kbd: kbd,
  empty: empty,
  item: item,
  "button-group": buttonGroup,
  typography: typography,
  resizable,
  carousel,
  chart,
  calendar,
  "date-picker": datePicker,
  "data-table": dataTable,
  message,
  bubble,
  attachment,
  marker,
  "message-scroller": messageScroller,
  questionnaire,
  sidebar,
  direction,
};

import { specBuilder, type PageSpec } from "./spec";

// The builder's example pages, as page specs: hand-written, and shown as the examples they are
// (never as AI output). They go through the same catalog, printer and preview a generated page
// will, so the pipeline is proven on pages people already look at.

export const EXAMPLE_PAGES = ["sign-in", "settings", "dashboard", "data-list"] as const;
export type ExamplePage = (typeof EXAMPLE_PAGES)[number];

function signIn(): PageSpec {
  const { add, spec } = specBuilder();
  const brand = add("Stack", { gap: 1, align: "center" }, [add("Heading", { text: "Acme", size: 3 }), add("Text", { text: "Invoices, customers and reports in one place.", tone: "muted", size: 2 })]);
  const email = add("Field", { label: "Email" }, [add("Input", { type: "email", placeholder: "you@company.com" })]);
  const password = add("Field", { label: "Password" }, [add("Input", { type: "password", placeholder: "••••••••" })]);
  const remember = add("Row", { justify: "between", align: "center", wrap: false }, [
    add("Checkbox", { label: "Remember me", defaultChecked: true, size: "sm" }),
    add("Button", { label: "Forgot password?", variant: "link", size: "sm" }),
  ]);
  const card = add("Card", { title: "Sign in", description: "Use your work email to continue.", footer: "stack" }, [email, password, remember], {
    footer: [add("Button", { label: "Sign in", fullWidth: true }), add("Button", { label: "Continue with Google", variant: "outline", fullWidth: true })],
  });
  const signUp = add("Row", { justify: "center", gap: 1, align: "center" }, [add("Text", { text: "New to Acme?", tone: "muted", size: 2 }), add("Button", { label: "Create an account", variant: "link", size: "sm" })]);
  return spec(add("Page", { width: "sm", align: "center" }, [add("Stack", { gap: 6 }, [brand, card, signUp])]));
}

function settings(): PageSpec {
  const { add, spec } = specBuilder();
  const title = add("Stack", { gap: 1 }, [add("Heading", { text: "Settings" }), add("Text", { text: "Your profile, notifications and the acme workspace.", tone: "muted", size: 2 })]);

  const names = add("Grid", { columns: 2 }, [
    add("Field", { label: "First name" }, [add("Input", { defaultValue: "Ada" })]),
    add("Field", { label: "Last name" }, [add("Input", { defaultValue: "Lovelace" })]),
  ]);
  // An error people would believe: a handle with a space in it.
  const handle = add("Field", { label: "Username", error: "Use letters, numbers and dashes only." }, [add("Input", { defaultValue: "ada lovelace" })]);
  const email = add("Field", { label: "Email", description: "Receipts and sign-in links go here." }, [add("Input", { type: "email", defaultValue: "ada@acme.com" })]);
  const bio = add("Field", { label: "Bio" }, [add("Textarea", { defaultValue: "Mathematician. Writes the occasional program." })]);
  const zone = add("Field", { label: "Time zone" }, [
    add("Select", {
      options: [
        { value: "utc", label: "UTC" },
        { value: "est", label: "Eastern" },
        { value: "pst", label: "Pacific" },
      ],
      defaultValue: "utc",
    }),
  ]);
  const visibility = add("Stack", { gap: 2 }, [
    add("Checkbox", { label: "Show my profile to other members", defaultChecked: true, size: "sm" }),
    add("Checkbox", { label: "Include me in the public directory", size: "sm" }),
  ]);
  const save = add("Row", { justify: "end" }, [add("Button", { label: "Cancel", variant: "ghost" }), add("Button", { label: "Save changes" })]);
  const danger = add("Stack", { gap: 5 }, [
    add("Separator"),
    add("Row", { justify: "between", wrap: false, gap: 4 }, [
      add("Stack", { gap: 0 }, [add("Text", { text: "Delete workspace" }), add("Text", { text: "This cannot be undone.", tone: "muted", size: 2 })]),
      add(
        "AlertDialog",
        { title: "Delete the acme workspace?", description: "Everyone loses access and its projects are removed. This cannot be undone.", confirm: "Delete workspace", intent: "danger" },
        [],
        { trigger: [add("Button", { label: "Delete", variant: "outline", intent: "danger" })] },
      ),
    ]),
  ]);

  const notifications = [
    add("Stack", { gap: 3 }, [
      add("Switch", { label: "Replies to my posts", defaultChecked: true, layout: "row" }),
      add("Switch", { label: "Mentions", defaultChecked: true, layout: "row" }),
      add("Switch", { label: "Product news", layout: "row" }),
    ]),
    add("Field", { label: "Email digest" }, [
      add("RadioGroup", {
        options: [
          { value: "daily", label: "Daily" },
          { value: "weekly", label: "Weekly" },
          { value: "never", label: "Never" },
        ],
        defaultValue: "weekly",
      }),
    ]),
    add("Field", { label: "Quiet hours" }, [add("Slider", { min: 18, max: 32, defaultValue: [22, 30] })]),
  ];
  const security = [
    add("Alert", {
      title: "Two-factor authentication is off",
      description: "Anyone with your password can sign in. Enter a code from your authenticator app to turn it on.",
      icon: "triangle-alert",
      variant: "soft",
      intent: "warning",
    }),
    add("Field", { label: "Code from your authenticator app" }, [add("InputOTP", { length: 6 })]),
    add("Switch", { label: "Ask for a code on new devices", defaultChecked: true, layout: "row" }),
  ];

  const tabs = add(
    "Tabs",
    {
      tabs: [
        { value: "profile", label: "Profile" },
        { value: "notifications", label: "Notifications" },
        { value: "security", label: "Security" },
        { value: "billing", label: "Billing" },
      ],
      defaultValue: "profile",
    },
    [],
    { profile: [names, handle, email, bio, zone, visibility, save, danger], notifications, security, billing: [add("Text", { text: "Billing details." })] },
  );
  return spec(add("Page", { width: "md" }, [title, tabs]));
}

const INVOICES = [
  ["INV-0231", "Acme Retail", "paid", "$1,250.00", "success"],
  ["INV-0230", "Northwind", "pending", "$860.00", "warning"],
  ["INV-0229", "Globex", "overdue", "$2,400.00", "danger"],
  ["INV-0228", "Initech", "paid", "$420.00", "success"],
  ["INV-0227", "Umbrella", "draft", "$3,100.00", "neutral"],
] as const;

function dashboard(): PageSpec {
  const { add, spec } = specBuilder();
  const head = add("Row", { justify: "between", align: "end", gap: 3 }, [
    add("Stack", { gap: 2 }, [
      add("Breadcrumb", { links: ["Acme", "Reports"], current: "Overview" }),
      add("Heading", { text: "Overview" }),
      add("Text", { text: "Invoices and customers across the acme workspace.", tone: "muted", size: 2 }),
    ]),
    add("Row", { gap: 2 }, [
      add("DropdownMenu", { items: [{ label: "Last 7 days" }, { label: "Last 30 days" }, { label: "This quarter" }] }, [], {
        trigger: [add("Button", { label: "Last 30 days", variant: "outline" })],
      }),
      add("Button", { label: "New invoice" }),
    ]),
  ]);
  const stats = add(
    "Grid",
    { columns: 4 },
    (
      [
        ["Revenue", "$48,210", "+12%", "success", "vs last month"],
        ["Active customers", "1,204", "+38", "success", "this week"],
        ["Open invoices", "17", "3 overdue", "danger", "of $9,860"],
        ["Churn", "1.8%", "−0.3 pts", "success", "vs last month"],
      ] as const
    ).map(([label, value, change, intent, note]) =>
      add("Card", {}, [
        add("Stack", { gap: 2 }, [
          add("Text", { text: label, tone: "muted", size: 2 }),
          add("Heading", { text: value, size: 5, level: 2 }),
          add("Row", { gap: 2, align: "center", wrap: false }, [add("Badge", { label: change, intent, size: "sm" }), add("Text", { text: note, tone: "muted", size: 1 })]),
        ]),
      ]),
    ),
  );
  const rows = INVOICES.map(([id, customer, status, amount, intent]) =>
    add("TableRow", {}, [add("Text", { text: id }), add("Text", { text: customer }), add("Badge", { label: status, intent }), add("Text", { text: amount })]),
  );
  const invoices = add(
    "Card",
    { title: "Recent invoices", description: "The five most recent invoices across all customers.", flush: true },
    [
      add(
        "Table",
        {
          label: "Recent invoices",
          columns: [{ label: "Invoice", mono: true }, { label: "Customer" }, { label: "Status" }, { label: "Amount", align: "end", mono: true }],
        },
        rows,
      ),
    ],
    { action: [add("Button", { label: "View all", variant: "outline", size: "sm" })] },
  );
  // Beside the invoices: where this month's money stands, and who to chase.
  const collected = add("Card", { title: "Collections", description: "This month, by amount." }, [
    add(
      "Stack",
      { gap: 4 },
      (
        [
          ["Paid", "$34,700", 72],
          ["Pending", "$8,690", 18],
          ["Overdue", "$4,820", 10],
        ] as const
      ).map(([label, amount, share]) =>
        add("Stack", { gap: 1.5 }, [
          add("Row", { justify: "between", wrap: false }, [add("Text", { text: label, size: 2 }), add("Text", { text: amount, tone: "muted", size: 2 })]),
          add("Progress", { label: `${label}: ${amount}`, value: share }),
        ]),
      ),
    ),
  ]);
  const chase = add(
    "Card",
    { title: "Needs attention" },
    OVERDUE.map(([name, what, days]) =>
      add("Row", { gap: 3, align: "center", wrap: false }, [
        add("Avatar", { name, size: "sm" }),
        add("Stack", { gap: 0 }, [add("Text", { text: name }), add("Text", { text: what, tone: "muted", size: 1 })]),
        add("Spacer"),
        add("Badge", { label: days, intent: "danger", variant: "soft", size: "sm" }),
      ]),
    ),
  );
  const body = add("Columns", { split: "2:1" }, [invoices, add("Stack", { gap: 6 }, [collected, chase])]);
  const page = add("Page", { width: "xl" }, [head, stats, body]);
  const shell = add(
    "AppShell",
    {
      brand: "Acme",
      nav: [
        { label: "Home", icon: "home", active: true },
        { label: "Inbox", icon: "inbox", badge: "12" },
        { label: "Projects", icon: "layers" },
        { label: "Team", icon: "users" },
        { label: "Settings", icon: "settings" },
      ],
      footer: "ada@acme.com",
    },
    [page],
  );
  return spec(shell);
}

const OVERDUE = [
  ["Globex", "INV-0229 · $2,400.00", "12 days"],
  ["Soylent", "INV-0224 · $1,620.00", "9 days"],
  ["Hooli", "INV-0219 · $800.00", "4 days"],
] as const;

const PEOPLE = ["Ada Lovelace", "Grace Hopper", "Edsger Dijkstra", "Barbara Liskov", "Alan Kay", "Frances Allen"];
const ROLES = ["Admin", "Member", "Viewer"];
const STATUS = [
  ["active", "success"],
  ["invited", "neutral"],
  ["suspended", "warning"],
] as const;

function dataList(): PageSpec {
  const { add, spec } = specBuilder();
  const invite = add("Sheet", { title: "Invite people", description: "They get an email with a link to join acme." }, [
    add("Field", { label: "Email" }, [add("Input", { type: "email", placeholder: "name@company.com" })]),
    add("Field", { label: "Message" }, [add("Textarea", { placeholder: "Optional note" })]),
  ], {
    trigger: [add("Button", { label: "Invite people", icon: "plus" })],
    footer: [add("Button", { label: "Send invite" }), add("Button", { label: "Cancel", variant: "outline", closes: true })],
  });
  const head = add("Row", { justify: "between", align: "end", gap: 3 }, [
    add("Stack", { gap: 1 }, [add("Heading", { text: "People" }), add("Text", { text: "48 members of the acme workspace, and who's still to join.", tone: "muted", size: 2 })]),
    invite,
  ]);
  const toolbar = add("Row", { gap: 2 }, [
    add("Input", { placeholder: "Filter people", width: "sm" }),
    add("Select", {
      label: "Status filter",
      options: [
        { value: "all", label: "All statuses" },
        { value: "active", label: "Active" },
        { value: "invited", label: "Invited" },
        { value: "suspended", label: "Suspended" },
      ],
      defaultValue: "all",
      width: "xs",
    }),
  ]);
  const rows = Array.from({ length: 12 }, (_, i) => {
    const name = PEOPLE[i % PEOPLE.length]!;
    const [status, intent] = STATUS[i % STATUS.length]!;
    return add("TableRow", {}, [
      add("Row", { gap: 3, wrap: false }, [add("Avatar", { name, size: "sm" }), add("Text", { text: name })]),
      add("Text", { text: `person${i + 1}@acme.com` }),
      add("Text", { text: ROLES[i % ROLES.length]! }),
      add("Badge", { label: status, intent, size: "sm" }),
      add(
        "DropdownMenu",
        { items: [{ label: "Edit" }, { label: "Change role" }, { label: "Remove", destructive: true, separatorBefore: true }], align: "end" },
        [],
        { trigger: [add("Button", { label: `Actions for ${name}`, icon: "ellipsis", iconOnly: true, variant: "ghost", size: "sm" })] },
      ),
    ]);
  });
  const table = add(
    "Table",
    {
      label: "People",
      columns: [{ label: "Name" }, { label: "Email", muted: true }, { label: "Role" }, { label: "Status" }, { label: "" }],
      selectable: true,
      defaultSelected: [1, 4],
      bulkActions: [{ label: "Remove" }],
    },
    rows,
  );
  const footer = add("Row", { justify: "between", gap: 3 }, [add("Text", { text: "Showing 12 of 48", tone: "muted", size: 2 }), add("Pagination", { current: 1, last: 4 })]);
  return spec(add("Page", { width: "lg" }, [head, add("Stack", { gap: 4 }, [toolbar, table, footer])]));
}

export const EXAMPLE_SPECS: Record<ExamplePage, () => PageSpec> = {
  "sign-in": signIn,
  settings,
  dashboard,
  "data-list": dataList,
};

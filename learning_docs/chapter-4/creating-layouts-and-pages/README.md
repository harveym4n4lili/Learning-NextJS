# Chapter 4: Creating Layouts and Pages

## Overview

This chapter covers Next.js's file-system routing - how folders, `page.tsx`, and `layout.tsx` files work together to create the structure and navigation of your application.

---

## Core Concepts

### 1. File-System Routing

Next.js automatically creates routes based on **folder structure**:
- Each **folder** = a **route segment** = **URL path**
- Special files like `page.tsx` make routes accessible
- Only `page.tsx` and `layout.tsx` are special - other files don't affect routing

**Example:**
```
/app/dashboard/invoices/page.tsx  →  /dashboard/invoices
```

### 2. Page Files (`page.tsx`)

A **required file** to make a route accessible.

**What it is:**
- React component that renders page content
- Must export a default function
- Only one per folder

**Example:**
```typescript
// /app/dashboard/page.tsx
export default function Page() {
  return <p>Dashboard Page</p>;
}
```

### 3. Layout Files (`layout.tsx`)

Creates **shared UI** across multiple pages (navigation, sidebar, footer, etc.).

**Key Features:**
- Wraps child pages in the `{children}` prop
- Persists during navigation (doesn't re-render)
- Can contain shared UI like navigation
- Automatically nested based on folder structure

**Example:**
```typescript
// /app/dashboard/layout.tsx
import SideNav from '@/app/ui/dashboard/sidenav';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col md:flex-row md:overflow-hidden">
      <div className="w-full flex-none md:w-64">
        <SideNav />
      </div>
      <div className="grow p-6 md:overflow-y-auto md:p-12">
        {children}
      </div>
    </div>
  );
}
```

---

## File Structure Example

Here's a complete folder structure for a dashboard app:

```
/app
├── layout.tsx              ← Root layout (ALL pages)
├── page.tsx                ← Home page (/)
│
└── /dashboard              ← Route segment
    ├── layout.tsx          ← Shared dashboard layout
    ├── page.tsx            ← Dashboard page (/dashboard)
    │
    ├── /customers          ← Route segment
    │   └── page.tsx        ← /dashboard/customers
    │
    └── /invoices           ← Route segment
        └── page.tsx        ← /dashboard/invoices
```

---

## Root Layout (`/app/layout.tsx`)

The **root layout is required** in every Next.js app.

**What it does:**
- Wraps **all pages** in your application
- Modifies `<html>` and `<body>` tags
- Add global metadata, fonts, styles
- Must return HTML structure

**Example:**
```typescript
// /app/layout.tsx
import '@/app/ui/global.css';
import { inter } from '@/app/ui/fonts';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

---

## How It Works: The `{children}` Prop

Layouts receive a `children` prop that contains:
- **Nested page** (if navigating to that page)
- **Nested layout** (if navigating through nested folders)

### Nesting in Action

When you navigate to `/dashboard/invoices`:

```
RootLayout
  └── layout.tsx receives:
      DashboardLayout
        └── layout.tsx receives:
            InvoicesPage (the children prop)
```

---

## Important Features

### 1. Partial Rendering

Only the **page component** updates when navigating - the **layout persists**.

**Why it matters:**
- ✅ Faster navigation (layout not re-rendered)
- ✅ Client-side state in layout is preserved
- ✅ Only `{children}` content changes

**Example:**
```typescript
// /app/dashboard/layout.tsx
export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true); // Persists!
  
  return (
    <div>
      <SideNav isOpen={sidebarOpen} />
      <main>{children}</main>
    </div>
  );
}
```

When you navigate between pages, `sidebarOpen` state is **not reset**.

### 2. Colocation

Keep related files together - only files in `page.tsx` are publicly accessible.

**Example folder structure:**
```
/dashboard
├── layout.tsx
├── page.tsx
├── components.tsx       ← Helper components (private)
├── utils.ts             ← Helper functions (private)
└── styles.module.css    ← Styles (private)
```

✅ `components.tsx` and `utils.ts` can be in the same folder  
✅ They won't be routable URLs  
✅ Easier to maintain and organize  

### 3. Nested Routing

Routes automatically nest based on folder hierarchy:

```
/app/dashboard/invoices/page.tsx
         ↓
URL path: /dashboard/invoices
     ↓
Component hierarchy:
RootLayout > DashboardLayout > InvoicesPage
```

---

## Common Patterns

### Adding a Sidebar to Dashboard

```typescript
// /app/dashboard/layout.tsx
import SideNav from '@/app/ui/dashboard/sidenav';

export default function DashboardLayout({ children }) {
  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-gray-900">
        <SideNav />
      </aside>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
```

### Multiple Route Segments

```
/invoices        →  /app/invoices/page.tsx
/customers       →  /app/customers/page.tsx
/dashboard       →  /app/dashboard/page.tsx
```

### Shared Headers and Footers

Use the **root layout** for site-wide headers/footers:

```typescript
// /app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
```

---

## Best Practices

✅ **Do:**
- Keep layouts for shared UI (navigation, sidebar, footer)
- Use pages for unique content
- Put helper files in the same folder as routes
- Use root layout for global styles and fonts
- Organize by feature (e.g., `/dashboard`, `/invoices`)

❌ **Don't:**
- Put business logic in layout files
- Create routes without a `page.tsx` (folders alone don't create routes)
- Put all code in `page.tsx` (split into components)

---

## Quick Reference

| File | Purpose | Required |
|------|---------|----------|
| `page.tsx` | Display page content | Yes (to make route accessible) |
| `layout.tsx` | Wrap pages in shared UI | No (but needed for nested UI) |
| Other files | Components, utils, styles | No (won't create routes) |

---

## File Structure Checklist

Create routes with this pattern:

```
/app
├── layout.tsx                    ← Root (required)
├── page.tsx                      ← Home page
└── /[feature-name]
    ├── layout.tsx                ← Optional shared layout
    └── page.tsx                  ← Feature page
```

---

## Next Steps

You now understand:
- How to organize files for routing
- How layouts persist during navigation
- How to create nested routes
- How to share UI across pages

Ready for the next chapter!

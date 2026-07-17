# Chapter 5: Navigating Between Pages

## Overview

This chapter covers how to navigate between pages in Next.js using the `Link` component and detecting the active page with `usePathname()`.

---

## The Problem: Traditional Navigation

Traditional HTML navigation with `<a>` tags has limitations:

❌ Full page refresh on every link click  
❌ No code optimization  
❌ Browser must download and parse entire page  
❌ Slower, less responsive feel  
❌ Lose component state during navigation  

---

## The Solution: Next.js `<Link>` Component

The `Link` component from `next/link` provides **client-side navigation**:

✅ No full page refresh  
✅ Automatic code-splitting by route  
✅ Background prefetching  
✅ Faster, app-like navigation  
✅ Preserve component state  

### Basic Usage

```typescript
import Link from 'next/link';

export default function Navigation() {
  return (
    <nav>
      <Link href="/dashboard">Dashboard</Link>
      <Link href="/dashboard/invoices">Invoices</Link>
      <Link href="/dashboard/customers">Customers</Link>
    </nav>
  );
}
```

**Key Point:** Use `href` prop (not `href` attribute like `<a>`).

---

## How `<Link>` Works

### 1. Client-Side Navigation

Unlike `<a>` tags that trigger a full page reload, `<Link>`:
- Updates only the page content
- Keeps layout and state intact
- Feels like a native app

### 2. Automatic Code-Splitting

Next.js automatically splits code by **route segment**:

```
/dashboard          → dashboard.js
/dashboard/invoices → invoices.js
/dashboard/customers → customers.js
```

**Benefits:**
- Each page is isolated
- Errors on one page don't crash others
- Only necessary code loads for each page

### 3. Background Prefetching (Production)

When a `<Link>` component appears in the viewport:
- Next.js prefetches the linked route's code
- Code loads in the background
- Navigation is **near-instant** when clicked

---

## Showing Active Links

To highlight the currently active page, use the `usePathname()` hook.

### Setup: Creating an Active Link Component

**File:** `/app/ui/nav-links.tsx`

```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <div className="flex space-x-4">
      <Link
        href="/dashboard"
        className={clsx(
          'px-4 py-2 rounded-md',
          {
            'bg-blue-500 text-white': pathname === '/dashboard',
            'text-gray-600': pathname !== '/dashboard',
          },
        )}
      >
        Dashboard
      </Link>

      <Link
        href="/dashboard/invoices"
        className={clsx(
          'px-4 py-2 rounded-md',
          {
            'bg-blue-500 text-white': pathname === '/dashboard/invoices',
            'text-gray-600': pathname !== '/dashboard/invoices',
          },
        )}
      >
        Invoices
      </Link>

      <Link
        href="/dashboard/customers"
        className={clsx(
          'px-4 py-2 rounded-md',
          {
            'bg-blue-500 text-white': pathname === '/dashboard/customers',
            'text-gray-600': pathname !== '/dashboard/customers',
          },
        )}
      >
        Customers
      </Link>
    </div>
  );
}
```

**Key Points:**
- `'use client'` - Must be a Client Component
- `usePathname()` - Returns current URL path
- `clsx` - Apply conditional styles
- Compare `pathname` with `link.href`

### Alternative: Create a Reusable NavLink Component

```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

export default function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={clsx(
        'px-4 py-2 rounded-md transition',
        {
          'bg-blue-500 text-white': isActive,
          'text-gray-600 hover:text-gray-900': !isActive,
        },
      )}
    >
      {children}
    </Link>
  );
}
```

**Usage:**
```typescript
<NavLink href="/dashboard">Dashboard</NavLink>
<NavLink href="/dashboard/invoices">Invoices</NavLink>
```

---

## Comparison: `<a>` vs `<Link>`

| Feature | `<a>` tag | `<Link>` |
|---------|-----------|---------|
| **Navigation** | Full page refresh | Client-side (no refresh) |
| **Code-Splitting** | No | Automatic ✅ |
| **Prefetching** | No | Yes (in production) ✅ |
| **Syntax** | `<a href="...">` | `<Link href="...">` |
| **Performance** | Slower | Faster ✅ |
| **State** | Lost on reload | Preserved ✅ |

---

## Using `usePathname()`

The `usePathname()` hook returns the **current URL path**.

### Common Use Cases

**1. Highlight Active Navigation Links**
```typescript
const pathname = usePathname();
if (pathname === '/dashboard') {
  // Show active state
}
```

**2. Conditional Rendering**
```typescript
if (pathname.startsWith('/dashboard/invoices')) {
  // Show invoice-specific UI
}
```

**3. Analytics Tracking**
```typescript
useEffect(() => {
  trackPageView(pathname);
}, [pathname]);
```

### Rules for `usePathname()`

⚠️ **Must use in Client Component** (`'use client'` at top)  
✅ Returns the current pathname  
✅ Works with dynamic routes  

---

## Dynamic Routes with Links

For dynamic routes, build the `href` dynamically:

```typescript
// /app/dashboard/invoices/page.tsx
import Link from 'next/link';

export default function InvoicesPage({ invoices }) {
  return (
    <div>
      {invoices.map((invoice) => (
        <Link
          key={invoice.id}
          href={`/dashboard/invoices/${invoice.id}`}
        >
          {invoice.title}
        </Link>
      ))}
    </div>
  );
}
```

---

## Best Practices

✅ **Always use `<Link>` for internal navigation**  
✅ Use `usePathname()` for active link styling  
✅ Make active states clear with different colors/backgrounds  
✅ Use `clsx` for conditional class management  
✅ Extract NavLink to a reusable component  

❌ **Don't use `<a>` tags for internal routes** (full page reload)  
❌ **Don't forget `'use client'`** when using hooks  
❌ **Don't hardcode paths** - use template literals for dynamic routes  

---

## Real-World Pattern: Sidebar Navigation

```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

const LINKS = [
  { name: 'Home', href: '/dashboard' },
  { name: 'Invoices', href: '/dashboard/invoices' },
  { name: 'Customers', href: '/dashboard/customers' },
  { name: 'Settings', href: '/dashboard/settings' },
];

export default function SideNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-gray-900 text-white w-64 p-4">
      {LINKS.map((link) => (
        <Link
          key={link.name}
          href={link.href}
          className={clsx(
            'block px-4 py-2 rounded-md mb-2 transition',
            {
              'bg-blue-600': pathname === link.href,
              'hover:bg-gray-800': pathname !== link.href,
            },
          )}
        >
          {link.name}
        </Link>
      ))}
    </nav>
  );
}
```

---

## Performance Benefits

### Before: Traditional `<a>` Tags
1. Click link
2. Browser requests entire page HTML
3. Download and parse all CSS/JS
4. Render page
5. **Result:** Noticeable delay ❌

### After: Next.js `<Link>`
1. Click link
2. Code already prefetched
3. Component state preserved
4. Only page content updates
5. **Result:** Near-instant navigation ✅

---

## Quick Reference

| Hook/Component | Purpose | Client Component? |
|---|---|---|
| `<Link>` | Navigate to page | No (Server OK) |
| `usePathname()` | Get current path | Yes (`'use client'`) |
| `clsx` | Conditional styles | No |

---

## Next Steps

You now understand:
- How to navigate with `<Link>` (client-side, fast)
- How to show active navigation states
- Performance benefits vs traditional links
- How to create reusable navigation components

Ready for the next chapter!

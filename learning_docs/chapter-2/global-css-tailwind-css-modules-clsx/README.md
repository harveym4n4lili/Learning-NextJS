# Chapter 2: CSS Styling - Global CSS, Tailwind, CSS Modules & clsx

## Overview

Next.js supports multiple styling approaches. This chapter covers:
- **Global CSS** - Apply styles across your entire app
- **Tailwind CSS** - Utility-first CSS framework
- **CSS Modules** - Component-scoped CSS with no collisions
- **clsx** - Conditional class toggling utility

---

## 1. Global Styles

Global CSS applies to **all routes** in your application. Import it in your **root layout**.

**File:** `/app/layout.tsx`
```typescript
import '@/app/ui/global.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

**Global CSS file:** `/app/ui/global.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## 2. Tailwind CSS

A **utility-first CSS framework** - style elements directly in JSX using class names.

### Why Tailwind?
✅ Speed up development  
✅ No style collisions  
✅ No separate stylesheets to maintain  
✅ CSS bundle stays small  

### Example Usage

```typescript
<main className="flex min-h-screen flex-col p-6">
  <div className="flex h-20 shrink-0 items-end rounded-lg bg-blue-500 p-4 md:h-52">
    {/* Styled components */}
  </div>
</main>
```

**Common Tailwind Classes:**
- `flex`, `grid` - Layout
- `bg-blue-500`, `text-white` - Colors
- `p-6`, `m-4` - Padding & margin
- `rounded-lg`, `shadow-md` - Borders & effects
- `md:h-52` - Responsive design (medium screens and up)

---

## 3. CSS Modules

Scope CSS to specific components - **automatic unique class names prevent collisions**.

### Create a CSS Module

**File:** `/app/ui/home.module.css`
```css
.shape {
  height: 0;
  width: 0;
  border-bottom: 30px solid black;
  border-left: 20px solid transparent;
  border-right: 20px solid transparent;
}
```

### Use in Component

**File:** `/app/page.tsx`
```typescript
import styles from '@/app/ui/home.module.css';

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col p-6">
      <div className={styles.shape} />
    </main>
  );
}
```

**Key Benefits:**
- Scoped to component only
- No class name conflicts
- Easy to maintain

---

## 4. Conditional Styling with clsx

Use `clsx` to toggle classes based on conditions.

### Installation
```bash
pnpm add clsx
```

### Example: Invoice Status Badge

```typescript
import clsx from 'clsx';

export default function InvoiceStatus({ status }: { status: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2 py-1 text-sm',
        {
          'bg-gray-100 text-gray-500': status === 'pending',
          'bg-green-500 text-white': status === 'paid',
        },
      )}
    >
      {status}
    </span>
  );
}
```

**What happens:**
- Base classes apply to all statuses
- Conditional object applies different colors based on `status`
- Clean, readable code

---

## Comparison Table

| Approach | Best For | Pros | Cons |
|----------|----------|------|------|
| **Tailwind** | Rapid development | Fast, scalable, no CSS file bloat | Class name list can get long |
| **CSS Modules** | Component isolation | Scoped, prevents collisions, traditional CSS | More file management |
| **Both** | Large apps | Maximum flexibility | Requires team coordination |

---

## Best Practices

1. ✅ Use root layout for global styles
2. ✅ Choose Tailwind OR CSS Modules (or use both!)
3. ✅ Use `clsx` for conditional classes
4. ✅ Keep class names organized and readable
5. ✅ Leverage responsive design (`md:`, `lg:`, `xl:`)

---

## Other Styling Options

- **Sass** - Import `.scss` files alongside CSS
- **CSS-in-JS** - styled-jsx, styled-components, emotion

---

## Next Steps
You now have three powerful ways to style your Next.js application. Choose based on your project needs!

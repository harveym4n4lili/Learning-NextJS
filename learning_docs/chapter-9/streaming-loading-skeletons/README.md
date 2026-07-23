# Chapter 9: Streaming & Loading Skeletons

## Overview

This chapter covers **Streaming** - a technique to show partial page content immediately while slower data fetches complete in the background. Combined with **Route Groups** and **Loading Skeletons**, streaming provides the best user experience.

---

## The Problem: Waiting for Slow Data

Recall from Chapter 8: **Dynamic rendering blocks the entire page** if any data fetch is slow.

```typescript
// ❌ Bad - User waits 3 seconds for entire page
export default async function Dashboard() {
  const revenue = await fetchRevenue();        // 1s
  const invoices = await fetchLatestInvoices(); // 3s ⚠️ Slowest blocks all
  const cardData = await fetchCardData();       // 1s
  
  return (
    <div>
      <RevenueChart data={revenue} />
      <InvoiceList data={invoices} />
      <CardStats data={cardData} />
    </div>
  );
}
```

**User experience:** 3-second blank screen 😞

---

## The Solution: Streaming

**Streaming** breaks the page into chunks and sends them progressively as data becomes ready.

**Instead of waiting 3 seconds for all data, the user sees:**
1. Instant: Layout + skeleton placeholders (0.1s)
2. After 1s: Revenue chart loads
3. After 3s: Invoice list loads
4. After 1s: Card stats load

**User experience:** Instant visual feedback, progressive content 🎉

### How Streaming Works

```
Request → Server renders page → Send skeleton UI immediately
                                ↓
                         Fetch slow data in background
                                ↓
                         Stream data chunks as ready
                                ↓
                         Browser updates page progressively
```

---

## Implementation Methods

### Method 1: Page-Level Streaming with `loading.tsx`

Create a **loading fallback file** at the page level:

**File:** `/app/dashboard/loading.tsx`

```typescript
import DashboardSkeleton from '@/app/ui/skeletons';

export default function Loading() {
  return <DashboardSkeleton />;
}
```

**How it works:**
- Built on top of React Suspense
- Shows fallback UI while page content loads
- Static elements (sidebars) shown immediately
- Dynamic elements replaced as data arrives

**Folder structure:**
```
/dashboard
├── layout.tsx      (Static - always shown)
├── loading.tsx     (Skeleton - shown while page loads)
└── page.tsx        (Dynamic - replaces loading when ready)
```

**Timeline:**
```
User visits /dashboard
  ↓
1. Show layout.tsx + loading.tsx skeleton (instant)
  ↓
2. Fetch data in page.tsx (in background)
  ↓
3. Replace loading.tsx with page.tsx content (when ready)
```

---

### Method 2: Loading Skeletons

**Skeletons** are simplified UI placeholders that match the real component layout but with placeholder content.

**Example skeleton:**
```typescript
// /app/ui/skeletons.tsx
export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      {/* Cards skeleton */}
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
      
      {/* Chart skeleton */}
      <div className="h-64 bg-gray-200 rounded animate-pulse" />
      
      {/* Table skeleton */}
      <div className="h-48 bg-gray-200 rounded animate-pulse" />
    </div>
  );
}
```

**Why skeletons work better than "Loading...":**
✅ Visual indication of page structure  
✅ Reduce perceived load time  
✅ Better UX than blank screen  
✅ Smooth transition when content arrives  

**Usage in loading.tsx:**
```typescript
// /app/dashboard/loading.tsx
import { DashboardSkeleton } from '@/app/ui/skeletons';

export default function Loading() {
  return <DashboardSkeleton />;
}
```

---

### Method 3: Component-Level Streaming with Suspense

For **granular control**, wrap individual components in React Suspense:

```typescript
// /app/dashboard/page.tsx
import { Suspense } from 'react';
import RevenueChart from '@/app/ui/dashboard/revenue-chart';
import { RevenueChartSkeleton } from '@/app/ui/skeletons';

export default async function Page() {
  return (
    <main className="space-y-6">
      {/* Revenue chart with loading skeleton */}
      <Suspense fallback={<RevenueChartSkeleton />}>
        <RevenueChart />
      </Suspense>
    </main>
  );
}
```

**Important:** Move data fetching into the component itself:

```typescript
// /app/ui/dashboard/revenue-chart.tsx
import { fetchRevenue } from '@/app/lib/data';

export default async function RevenueChart() {
  // Fetch inside the component
  const revenue = await fetchRevenue();
  
  return (
    <div>
      <h2>Revenue Chart</h2>
      {/* Render chart */}
    </div>
  );
}
```

**Why move fetching to the component?**
- Suspense wraps the component, not the fetch
- Allows granular loading states
- Component can be reused elsewhere
- Data fetching stays close to where it's used

---

## Route Groups

**Route Groups** organize files into logical folders without changing the URL structure.

### Creating Route Groups

Use **parentheses** `()` around the folder name:

```
/app
├── /dashboard
│   ├── /(overview)        ← Route group
│   │   ├── page.tsx       → URL: /dashboard
│   │   └── loading.tsx
│   ├── /invoices
│   │   ├── page.tsx       → URL: /dashboard/invoices
│   │   └── loading.tsx
│   └── /customers
│       ├── page.tsx       → URL: /dashboard/customers
│       └── loading.tsx
```

**URL behavior:**
- `/dashboard/(overview)/page.tsx` → `/dashboard` ✅
- `/dashboard/invoices/page.tsx` → `/dashboard/invoices` ✅
- `/dashboard/customers/page.tsx` → `/dashboard/customers` ✅

Parentheses are **stripped from URLs** - they only organize files!

### Benefits of Route Groups

✅ **Organize by section** - Group related pages together  
✅ **Selective loading states** - Different `loading.tsx` per group  
✅ **Team organization** - Separate features by team  
✅ **No URL impact** - Groups don't affect routing  

### Example: Marketing & Dashboard

```
/app
├── /(marketing)
│   ├── page.tsx          → /
│   ├── about/page.tsx    → /about
│   └── pricing/page.tsx  → /pricing
└── /(dashboard)
    ├── page.tsx          → /dashboard
    ├── invoices/page.tsx → /dashboard/invoices
    └── customers/page.tsx → /dashboard/customers
```

Each group can have its own `layout.tsx` for different designs!

---

## Grouping Components (Staggered Loading)

Prevent "popping" (UI elements appearing suddenly) by grouping related components:

### Problem: Component-by-Component Loading

```typescript
// ❌ Each card loads separately - UI pops
export default async function Page() {
  return (
    <div className="grid grid-cols-4 gap-4">
      <Suspense fallback={<CardSkeleton />}>
        <Card1 />  {/* Loads at different time */}
      </Suspense>
      
      <Suspense fallback={<CardSkeleton />}>
        <Card2 />  {/* Pops in when ready */}
      </Suspense>
      
      <Suspense fallback={<CardSkeleton />}>
        <Card3 />  {/* Pops in later */}
      </Suspense>
    </div>
  );
}
```

**User sees:** Cards appearing one-by-one, jarring UX 😞

### Solution: Wrap Components Together

```typescript
// ✅ Group cards together - all load at same time
import { Suspense } from 'react';
import CardWrapper from '@/app/ui/dashboard/cards';
import { CardsSkeleton } from '@/app/ui/skeletons';

export default async function Page() {
  return (
    <div>
      <Suspense fallback={<CardsSkeleton />}>
        <CardWrapper />
      </Suspense>
    </div>
  );
}
```

**CardWrapper component:**
```typescript
// /app/ui/dashboard/cards.tsx
import { fetchCardData } from '@/app/lib/data';

export default async function CardWrapper() {
  const cardData = await fetchCardData();
  
  return (
    <div className="grid grid-cols-4 gap-4">
      <Card title="Collected" value={cardData.totalPaidInvoices} />
      <Card title="Pending" value={cardData.totalPendingInvoices} />
      <Card title="Invoices" value={cardData.totalInvoices} />
      <Card title="Customers" value={cardData.totalCustomers} />
    </div>
  );
}
```

**User sees:** All cards appear together smoothly ✅

---

## Where to Place Suspense Boundaries?

Deciding where to put `<Suspense>` boundaries affects user experience:

### Approach 1: Stream Whole Page

```typescript
// /app/dashboard/page.tsx
export default async function Page() {
  // All data loads together
  const [revenue, invoices, cards] = await Promise.all([
    fetchRevenue(),
    fetchInvoices(),
    fetchCardData(),
  ]);
  
  return (
    <>
      <RevenueChart data={revenue} />
      <InvoiceList data={invoices} />
      <CardStats data={cards} />
    </>
  );
}
```

**Pros:** Simple  
**Cons:** Wait for slowest component

### Approach 2: Stream Every Component

```typescript
// ✅ Granular control
<Suspense fallback={<RevenueSkeleton />}>
  <RevenueChart />
</Suspense>

<Suspense fallback={<InvoiceSkeleton />}>
  <InvoiceList />
</Suspense>

<Suspense fallback={<CardsSkeleton />}>
  <CardStats />
</Suspense>
```

**Pros:** Granular, show content ASAP  
**Cons:** UI pops as items arrive

### Approach 3: Stream Page Sections (Balanced)

```typescript
// ✅ Best of both worlds
<Suspense fallback={<CardsSkeleton />}>
  <CardWrapper /> {/* 4 cards load together */}
</Suspense>

<Suspense fallback={<RevenueSkeleton />}>
  <RevenueChart /> {/* Separate skeleton */}
</Suspense>

<Suspense fallback={<InvoiceSkeleton />}>
  <InvoiceList /> {/* Separate skeleton */}
</Suspense>
```

**Pros:** Balanced, grouped items, staggered sections  
**Cons:** Slight complexity

**Best practice:** Use Approach 3 - group related components

---

## Step-by-Step Implementation

### Step 1: Create Skeletons

```typescript
// /app/ui/skeletons.tsx
export function CardSkeleton() {
  return <div className="h-20 bg-gray-200 rounded animate-pulse" />;
}

export function CardsSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
```

### Step 2: Move Data Fetching to Components

```typescript
// /app/ui/dashboard/cards.tsx
import { fetchCardData } from '@/app/lib/data';

export default async function CardWrapper() {
  const cardData = await fetchCardData();
  // Render cards...
}
```

### Step 3: Wrap in Suspense

```typescript
// /app/dashboard/page.tsx
import { Suspense } from 'react';
import CardWrapper from '@/app/ui/dashboard/cards';
import { CardsSkeleton } from '@/app/ui/skeletons';

export default async function Page() {
  return (
    <Suspense fallback={<CardsSkeleton />}>
      <CardWrapper />
    </Suspense>
  );
}
```

### Step 4: Use Route Groups (Optional)

```
/dashboard
├── /(overview)
│   ├── page.tsx     (Has multiple Suspense boundaries)
│   └── loading.tsx  (Page-level fallback)
└── /invoices
    └── page.tsx
```

---

## Performance Comparison

### Before: Dynamic Rendering (No Streaming)
```
User visits → Wait 3s → See entire page
😞 Blank screen for 3 seconds
```

### After: Streaming with Skeletons
```
User visits → 0s: See skeleton UI
           → 1s: Cards load
           → 2s: Chart loads
           → 3s: Invoices load
✅ Immediate feedback, progressive content
```

---

## Best Practices

✅ **Use loading.tsx for page-level fallbacks**  
✅ **Create skeleton components that match real layout**  
✅ **Move data fetching to components that use it**  
✅ **Group related components with single Suspense**  
✅ **Use route groups to organize related pages**  
✅ **Keep skeletons simple and lightweight**  

❌ **Don't** use "Loading..." text instead of skeletons  
❌ **Don't** wrap every single component in Suspense  
❌ **Don't** fetch data at page level if using component-level Suspense  
❌ **Don't** use route groups to hide structure - they affect organization  

---

## Quick Reference

| Concept | Purpose |
|---------|---------|
| **loading.tsx** | Page-level fallback skeleton |
| **Suspense** | Component-level streaming boundary |
| **Skeleton** | Visual placeholder matching real layout |
| **Route Group** | Organize files without URL impact |
| **CardWrapper** | Component that groups related items |

---

## Folder Structure Example

```
/app/dashboard
├── layout.tsx              (Static layout)
├── loading.tsx             (Page skeleton)
├── page.tsx                (Dashboard page with Suspense)
│
├── /(overview)
│   ├── page.tsx
│   ├── loading.tsx
│   └── layout.tsx
│
├── /invoices
│   ├── page.tsx
│   └── loading.tsx
│
└── /customers
    ├── page.tsx
    └── loading.tsx

/ui/skeletons.tsx          (All skeleton components)
```

---

## Next Steps

You now understand:
- **Streaming** - Progressive page rendering
- **Skeletons** - Visual loading placeholders
- **Suspense** - Component-level boundaries
- **Route Groups** - File organization without URL changes
- **Best practices** - Where to place Suspense boundaries
- **Performance** - From 3s blank screen to instant + progressive content

Ready for more advanced Next.js features! 🚀

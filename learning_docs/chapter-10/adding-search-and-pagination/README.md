# Chapter 10: Adding Search and Pagination

## Overview

This chapter covers implementing **search** and **pagination** functionality in a Next.js dashboard using URL search parameters. Instead of storing search state in React (client), we use URL parameters - making searches bookmarkable, shareable, and server-friendly.

---

## Why URL Search Parameters?

### Traditional Approach (Client State)
```typescript
// ❌ Bad - State in React component
const [query, setQuery] = useState('');
const [page, setPage] = useState(1);
```

**Problems:**
- URL doesn't change - can't bookmark/share
- State lost on page refresh
- Harder to track analytics

### Better Approach (URL Parameters)
```typescript
// ✅ Good - State in URL
// URL: /dashboard/invoices?query=pending&page=2
```

**Benefits:**
✅ **Bookmarkable URLs** - Users can save searches  
✅ **Shareable** - Copy/paste URL to share results  
✅ **Server-rendered** - URL params available on server  
✅ **Analytics-friendly** - Track searches easily  
✅ **Back/Forward buttons work** - Browser history preserved  

---

## Next.js Hooks for Search

### `useSearchParams()`
Get current URL parameters (client-side)

```typescript
'use client';
import { useSearchParams } from 'next/navigation';

export default function SearchComponent() {
  const searchParams = useSearchParams();
  
  // From URL: ?query=pending&page=2
  const query = searchParams.get('query');  // 'pending'
  const page = searchParams.get('page');    // '2'
}
```

### `usePathname()`
Get current URL path (client-side)

```typescript
'use client';
import { usePathname } from 'next/navigation';

export default function Component() {
  const pathname = usePathname();
  // Returns: '/dashboard/invoices'
}
```

### `useRouter()`
Programmatic navigation (client-side)

```typescript
'use client';
import { useRouter } from 'next/navigation';

export default function Component() {
  const router = useRouter();
  
  // Navigate to new URL
  router.push('/new-page');
  router.replace('/new-page');  // Without history
}
```

### `searchParams` Prop
Get URL parameters on server (server-side)

```typescript
// /app/dashboard/invoices/page.tsx
export default async function Page(props: {
  searchParams?: Promise<{
    query?: string;
    page?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const query = searchParams?.query || '';
  const page = searchParams?.page || '1';
  
  // Fetch data with query/page on server
  const results = await fetchInvoices(query, page);
}
```

---

## Implementing Search Step-by-Step

### Step 1: Create Search Input Component

**File:** `/app/ui/search.tsx`

```typescript
'use client';

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function Search({ placeholder }: { placeholder: string }) {
  function handleSearch(term: string) {
    console.log(`Searching for: ${term}`);
  }

  return (
    <div className="relative">
      <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-3" />
      <input
        type="text"
        placeholder={placeholder}
        onChange={(e) => handleSearch(e.target.value)}
        className="pl-10 py-2 border rounded-md"
      />
    </div>
  );
}
```

### Step 2: Update URL with Search Parameters

```typescript
'use client';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';

export default function Search({ placeholder }: { placeholder: string }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  function handleSearch(term: string) {
    // Create new URLSearchParams from current params
    const params = new URLSearchParams(searchParams);
    
    if (term) {
      // Add query parameter
      params.set('query', term);
    } else {
      // Remove query parameter if empty
      params.delete('query');
    }
    
    // Navigate to new URL with updated params
    replace(`${pathname}?${params.toString()}`);
  }

  return (
    <input
      type="text"
      placeholder={placeholder}
      onChange={(e) => handleSearch(e.target.value)}
    />
  );
}
```

**What happens:**
```
User types "pending"
  ↓
handleSearch('pending')
  ↓
params.set('query', 'pending')
  ↓
URL changes to: /dashboard/invoices?query=pending
  ↓
Server re-renders with new data
```

### Step 3: Keep Input in Sync with URL

```typescript
<input
  type="text"
  placeholder={placeholder}
  onChange={(e) => handleSearch(e.target.value)}
  defaultValue={searchParams.get('query')?.toString()}
/>
```

**Result:** Input shows current search term from URL

### Step 4: Fetch Data on Server with Query

**File:** `/app/dashboard/invoices/page.tsx`

```typescript
import { Suspense } from 'react';
import InvoicesTable from '@/app/ui/invoices/table';
import { InvoicesTableSkeleton } from '@/app/ui/skeletons';

export default async function Page(props: {
  searchParams?: Promise<{
    query?: string;
    page?: string;
  }>;
}) {
  // Get search params from URL
  const searchParams = await props.searchParams;
  const query = searchParams?.query || '';
  const currentPage = Number(searchParams?.page) || 1;

  return (
    <div>
      <Search placeholder="Search invoices..." />
      
      <Suspense key={query + currentPage} fallback={<InvoicesTableSkeleton />}>
        <InvoicesTable query={query} currentPage={currentPage} />
      </Suspense>
    </div>
  );
}
```

**File:** `/app/ui/invoices/table.tsx`

```typescript
import { fetchFilteredInvoices } from '@/app/lib/data';

export default async function InvoicesTable({
  query,
  currentPage,
}: {
  query: string;
  currentPage: number;
}) {
  // Fetch only matching invoices
  const invoices = await fetchFilteredInvoices(query, currentPage);

  return (
    <table>
      <tbody>
        {invoices.map((invoice) => (
          <tr key={invoice.id}>
            <td>{invoice.customer}</td>
            <td>${invoice.amount}</td>
            <td>{invoice.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

## Debouncing for Performance

**Problem:** Search fires on every keystroke = too many database queries

```
User types "pending"
  p     → Query database
  pe    → Query database
  pen   → Query database
  pend  → Query database
  pendi → Query database
  pendin → Query database
  pending → Query database
```

**Total: 7 database queries for 1 search!** 😞

### Solution: Debouncing

Debouncing waits for the user to stop typing before searching.

**Install debouncing library:**
```bash
pnpm add use-debounce
```

**Implement debouncing:**

```typescript
'use client';

import { useDebouncedCallback } from 'use-debounce';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';

export default function Search({ placeholder }: { placeholder: string }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  // Debounce search: wait 300ms after user stops typing
  const handleSearch = useDebouncedCallback((term) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', '1'); // Reset to page 1 on new search
    
    if (term) {
      params.set('query', term);
    } else {
      params.delete('query');
    }
    
    replace(`${pathname}?${params.toString()}`);
  }, 300); // Wait 300ms

  return (
    <input
      type="text"
      placeholder={placeholder}
      onChange={(e) => handleSearch(e.target.value)}
      defaultValue={searchParams.get('query')?.toString()}
    />
  );
}
```

**Result:**
```
User types "pending" with 300ms debounce
  p     → Wait...
  pe    → Wait...
  pen   → Wait...
  pend  → Wait...
  pendi → Wait...
  pendin → Wait...
  pending → [300ms after typing stops] → Query database ONCE ✅
```

**Total: 1 database query!** (vs 7 before) 🚀

---

## Implementing Pagination

### Step 1: Calculate Total Pages on Server

**File:** `/app/lib/data.ts`

```typescript
export async function fetchInvoicesPages(query: string) {
  const count = await sql`
    SELECT COUNT(*) 
    FROM invoices 
    WHERE customer_name ILIKE ${`%${query}%`}
  `;
  
  const totalPages = Math.ceil(count[0].count / ITEMS_PER_PAGE);
  return totalPages;
}
```

### Step 2: Pass Total Pages to Page Component

**File:** `/app/dashboard/invoices/page.tsx`

```typescript
export default async function Page(props: {
  searchParams?: Promise<{
    query?: string;
    page?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const query = searchParams?.query || '';
  const currentPage = Number(searchParams?.page) || 1;
  
  // Fetch total pages (for pagination component)
  const totalPages = await fetchInvoicesPages(query);

  return (
    <div>
      <Search placeholder="Search..." />
      <InvoicesTable query={query} currentPage={currentPage} />
      <Pagination totalPages={totalPages} />
    </div>
  );
}
```

### Step 3: Create Pagination Component

**File:** `/app/ui/invoices/pagination.tsx`

```typescript
'use client';

import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

export default function Pagination({ totalPages }: { totalPages: number }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPage = Number(searchParams.get('page')) || 1;

  // Helper to create page URLs with query preserved
  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  return (
    <div className="flex gap-2 items-center">
      <PrevButton 
        url={createPageURL(currentPage - 1)} 
        disabled={currentPage <= 1} 
      />
      
      <p className="text-sm">
        Page {currentPage} of {totalPages}
      </p>
      
      <NextButton 
        url={createPageURL(currentPage + 1)} 
        disabled={currentPage >= totalPages} 
      />
    </div>
  );
}

function PrevButton({ url, disabled }: { url: string; disabled: boolean }) {
  return (
    <Link
      href={url}
      className={disabled ? 'opacity-50 cursor-not-allowed' : ''}
      aria-disabled={disabled}
    >
      <ChevronLeftIcon className="w-5 h-5" />
    </Link>
  );
}

function NextButton({ url, disabled }: { url: string; disabled: boolean }) {
  return (
    <Link
      href={url}
      className={disabled ? 'opacity-50 cursor-not-allowed' : ''}
      aria-disabled={disabled}
    >
      <ChevronRightIcon className="w-5 h-5" />
    </Link>
  );
}
```

### Step 4: Reset Page on New Search

When user searches, reset to page 1:

```typescript
const handleSearch = useDebouncedCallback((term) => {
  const params = new URLSearchParams(searchParams);
  params.set('page', '1'); // ✅ Reset to page 1
  
  if (term) {
    params.set('query', term);
  } else {
    params.delete('query');
  }
  
  replace(`${pathname}?${params.toString()}`);
}, 300);
```

**Why?** If user is on page 3 and searches, results might only have 1 page.

---

## URL Patterns

### Example: Search with Pagination

```
URL: /dashboard/invoices?query=pending&page=2

searchParams = {
  query: 'pending',
  page: '2'
}
```

**User can:**
- ✅ Bookmark: `/dashboard/invoices?query=pending&page=2`
- ✅ Share URL with others
- ✅ Use browser back/forward buttons
- ✅ See search in browser history

---

## Best Practices

✅ **Use URL for state** - Not client React state  
✅ **Debounce search** - Reduce database queries  
✅ **Reset pagination on new search** - Avoid empty results  
✅ **Keep input synced with URL** - Shows current search term  
✅ **Fetch on server** - Security and efficiency  
✅ **Preserve query when paginating** - `createPageURL()`  

❌ **Don't** store search/page in React state  
❌ **Don't** query on every keystroke (use debouncing)  
❌ **Don't** forget to reset page on new search  
❌ **Don't** hardcode pagination - calculate from data  

---

## Performance Comparison

### Without Debouncing
- User types 7 characters: 7 database queries
- Time: Multiple queries = slower response

### With Debouncing (300ms)
- User types 7 characters: 1 database query (after 300ms pause)
- Time: Single query = fast response

**Result:** Fewer queries, faster searches, better UX 🚀

---

## Complete Example

**File:** `/app/dashboard/invoices/page.tsx`

```typescript
import { Suspense } from 'react';
import Search from '@/app/ui/search';
import InvoicesTable from '@/app/ui/invoices/table';
import Pagination from '@/app/ui/invoices/pagination';
import { InvoicesTableSkeleton } from '@/app/ui/skeletons';
import { fetchInvoicesPages } from '@/app/lib/data';

export default async function Page(props: {
  searchParams?: Promise<{
    query?: string;
    page?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const query = searchParams?.query || '';
  const currentPage = Number(searchParams?.page) || 1;
  const totalPages = await fetchInvoicesPages(query);

  return (
    <div className="space-y-4">
      {/* Search component */}
      <Search placeholder="Search invoices..." />
      
      {/* Table with skeleton fallback */}
      <Suspense key={query + currentPage} fallback={<InvoicesTableSkeleton />}>
        <InvoicesTable query={query} currentPage={currentPage} />
      </Suspense>
      
      {/* Pagination controls */}
      <Pagination totalPages={totalPages} />
    </div>
  );
}
```

---

## Quick Reference

| Task | Hook | Component |
|------|------|-----------|
| **Read params** | `useSearchParams()` | Client |
| **Read pathname** | `usePathname()` | Client |
| **Navigate** | `useRouter().replace()` | Client |
| **Read params on server** | `searchParams` prop | Server |
| **Debounce search** | `useDebouncedCallback()` | Client |

---

## Folder Structure

```
/app/dashboard/invoices
├── page.tsx              (Server component - reads searchParams)
└── /ui
    ├── search.tsx        (Client component - handles search)
    ├── table.tsx         (Server component - displays results)
    └── pagination.tsx    (Client component - handles pagination)
```

---

## Next Steps

You now understand:
- **URL search parameters** - How to use them for state
- **Search implementation** - Step-by-step guide
- **Debouncing** - Reduce queries with 300ms delay
- **Pagination** - Split results across pages
- **Best practices** - Client vs server responsibilities
- **Performance** - 7x fewer queries with debouncing

Ready for more advanced features! 🎉

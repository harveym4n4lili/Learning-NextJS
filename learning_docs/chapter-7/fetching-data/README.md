# Chapter 7: Fetching Data

## Overview

This chapter covers different strategies for fetching data in Next.js applications and how to optimize for performance using Server Components and parallel data fetching.

---

## Three Approaches to Fetch Data

### 1. API Layer (Route Handlers)

Use an **API endpoint** as a middleman to fetch data.

**When to use:**
- Fetching from third-party services with APIs
- Need to hide backend secrets from client
- Building a public API for external consumers

**Example:**
```typescript
// /app/api/invoices/route.ts
import { sql } from '@/app/lib/db';

export async function GET() {
  try {
    const invoices = await sql`SELECT * FROM invoices`;
    return Response.json(invoices);
  } catch (error) {
    return Response.json({ error: 'Database error' }, { status: 500 });
  }
}
```

**Client-side usage:**
```typescript
// Component that runs in browser
'use client';
import { useEffect, useState } from 'react';

export default function InvoicesList() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetch('/api/invoices')
      .then(res => res.json())
      .then(data => setData(data));
  }, []);
  
  return <div>{/* render data */}</div>;
}
```

---

### 2. Direct Database Queries (Recommended)

Query the database **directly from Server Components** - no API layer needed.

**When to use:**
- You're using React Server Components (default in Next.js)
- You want to keep data queries simple and efficient
- You don't need to expose an API endpoint

**Why it's better:**
✅ Skip the API layer (simpler)  
✅ Secrets stay on server (safer)  
✅ Fetch exactly what you need  
✅ Faster response times  

**Example:**
```typescript
// /app/dashboard/page.tsx
import { sql } from '@/app/lib/db';

export default async function DashboardPage() {
  const invoices = await sql`
    SELECT * FROM invoices 
    LIMIT 10
  `;
  
  return (
    <div>
      {invoices.map(invoice => (
        <div key={invoice.id}>{invoice.amount}</div>
      ))}
    </div>
  );
}
```

---

### 3. React Server Components (Default)

Next.js uses **React Server Components** by default - they support `async/await` natively.

**What are Server Components?**
- React components that run ONLY on the server
- Can access databases, APIs, and secrets
- No client-side JavaScript needed
- Data fetched on server, HTML sent to browser

**Key Benefits:**
✅ Full JavaScript access on server  
✅ Direct database access  
✅ Keep secrets safe  
✅ Reduce JavaScript sent to browser  
✅ No `useEffect`, `useState`, or data-fetching libraries needed  

**Server Component Syntax:**
```typescript
// ✅ This is a Server Component by default
export default async function Page() {
  const data = await fetchData();
  return <div>{data}</div>;
}
```

**Client Component Syntax:**
```typescript
// ❌ This is a Client Component (needs 'use client')
'use client';
import { useEffect, useState } from 'react';

export default function Page() {
  const [data, setData] = useState(null);
  useEffect(() => { /* fetch data */ }, []);
  return <div>{data}</div>;
}
```

---

## Using SQL with postgres.js

The recommended way to query PostgreSQL databases in Next.js.

### Setup

**File:** `/app/lib/data.ts`

```typescript
import postgres from 'postgres';

// Connect to database using environment variable
const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

// Export reusable query functions
export async function fetchLatestInvoices() {
  try {
    const data = await sql`
      SELECT 
        invoices.amount, 
        customers.name, 
        customers.image_url, 
        customers.email,
        invoices.id
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      ORDER BY invoices.date DESC
      LIMIT 5
    `;
    return data;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices');
  }
}
```

### Using in Components

```typescript
// /app/dashboard/page.tsx
import { fetchLatestInvoices } from '@/app/lib/data';

export default async function Page() {
  const invoices = await fetchLatestInvoices();
  
  return (
    <div>
      {invoices.map((invoice) => (
        <div key={invoice.id}>
          <p>{invoice.name}</p>
          <p>${invoice.amount}</p>
        </div>
      ))}
    </div>
  );
}
```

### SQL Basics for Next.js

**Fetch specific columns (not all):**
```sql
SELECT name, amount FROM invoices;  -- ✅ Efficient
SELECT * FROM invoices;              -- ❌ Wasteful
```

**Count rows:**
```sql
SELECT COUNT(*) FROM invoices;
```

**Filter data:**
```sql
SELECT * FROM invoices WHERE status = 'paid';
```

**Join tables:**
```sql
SELECT invoices.amount, customers.name
FROM invoices
JOIN customers ON invoices.customer_id = customers.id;
```

**Limit results:**
```sql
SELECT * FROM invoices LIMIT 10;
```

**Order results:**
```sql
SELECT * FROM invoices ORDER BY date DESC;
```

---

## Avoiding Request Waterfalls

A **waterfall** happens when requests run sequentially - each one waits for the previous to complete. This is slow.

### The Problem: Sequential Requests

```typescript
// ❌ Bad - Creates a waterfall
export default async function Page() {
  const revenue = await fetchRevenue();        // Wait 1s
  const invoices = await fetchLatestInvoices(); // Wait 1s
  const customers = await fetchCardData();      // Wait 1s
  
  // Total time: 3 seconds!
  
  return (
    <div>
      {/* render data */}
    </div>
  );
}
```

**Timeline:**
```
Time: 0s -----> revenue (1s) -----> invoices (1s) -----> customers (1s)
      Total: 3 seconds
```

### The Solution: Parallel Requests

Use **`Promise.all()`** to start all requests simultaneously:

```typescript
// ✅ Good - Parallel requests
export default async function Page() {
  const revenuePromise = fetchRevenue();
  const invoicesPromise = fetchLatestInvoices();
  const customersPromise = fetchCardData();
  
  const [revenue, invoices, customers] = await Promise.all([
    revenuePromise,
    invoicesPromise,
    customersPromise,
  ]);
  
  // Total time: 1 second (same as slowest request)
  
  return (
    <div>
      {/* render data */}
    </div>
  );
}
```

**Timeline:**
```
Time: 0s -----> All requests run in parallel (1s)
      Total: 1 second (3x faster!)
```

### Using Promise.allSettled()

If one request might fail and you want to continue anyway:

```typescript
const results = await Promise.allSettled([
  fetchRevenue(),
  fetchInvoices(),
  fetchCustomers(),
]);

// results = [
//   { status: 'fulfilled', value: {...} },
//   { status: 'rejected', reason: Error },
//   { status: 'fulfilled', value: {...} }
// ]
```

---

## Real-World Example: Dashboard Page

```typescript
// /app/dashboard/page.tsx
import { fetchCardData, fetchLatestInvoices, fetchRevenue } from '@/app/lib/data';

export default async function DashboardPage() {
  // Start all requests in parallel
  const [cardData, invoices, revenue] = await Promise.all([
    fetchCardData(),
    fetchLatestInvoices(),
    fetchRevenue(),
  ]);

  return (
    <main>
      <h1>Dashboard</h1>
      
      {/* Display stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card title="Total Invoices" value={cardData.invoices} />
        <Card title="Total Customers" value={cardData.customers} />
        <Card title="Paid" value={cardData.paid} />
        <Card title="Pending" value={cardData.pending} />
      </div>

      {/* Display latest invoices */}
      <div className="mt-8">
        <h2>Latest Invoices</h2>
        {invoices.map((invoice) => (
          <InvoiceRow key={invoice.id} invoice={invoice} />
        ))}
      </div>

      {/* Display revenue chart */}
      <div className="mt-8">
        <RevenueChart data={revenue} />
      </div>
    </main>
  );
}
```

---

## Data Fetching Best Practices

### ✅ Do

1. **Fetch only what you need**
   ```typescript
   // ✅ Good
   SELECT name, amount FROM invoices;
   ```

2. **Use LIMIT and COUNT() in SQL**
   ```typescript
   // ✅ Good - Let database do the work
   SELECT COUNT(*) FROM invoices;
   SELECT * FROM invoices LIMIT 10;
   ```

3. **Fetch data in parallel**
   ```typescript
   // ✅ Good
   await Promise.all([fetch1(), fetch2(), fetch3()]);
   ```

4. **Centralize data queries**
   ```typescript
   // ✅ Good - Keep all queries in /app/lib/data.ts
   export async function fetchInvoices() { ... }
   ```

5. **Use Server Components by default**
   ```typescript
   // ✅ Good - Fetch data directly
   export default async function Page() {
     const data = await fetchData();
   }
   ```

### ❌ Don't

1. **Fetch all data and filter in JavaScript**
   ```typescript
   // ❌ Bad - Wasteful
   const allInvoices = await sql`SELECT * FROM invoices`;
   const filtered = allInvoices.filter(i => i.amount > 100);
   ```

2. **Make sequential requests**
   ```typescript
   // ❌ Bad - Slow waterfall
   const a = await fetch1();
   const b = await fetch2();
   const c = await fetch3();
   ```

3. **Use Client Components for data fetching**
   ```typescript
   // ❌ Bad - Unnecessary complexity
   'use client';
   useEffect(() => { fetch('/api/data'); }, []);
   ```

4. **Expose database secrets to client**
   ```typescript
   // ❌ Bad - NEVER do this
   const connectionString = process.env.POSTGRES_URL; // Don't use on client
   ```

---

## Comparison Table

| Approach | When | Pros | Cons |
|----------|------|------|------|
| **API Layer** | Third-party APIs, public endpoints | Flexible, separates concerns | Extra network hop, complexity |
| **Direct SQL** | Server Components | Simple, fast, secure | Limited to server-side |
| **Server Components** | Default in Next.js | Native async/await, simple | No client interactivity |

---

## Quick Reference

| Concept | Example |
|---------|---------|
| **Server Component** | `export default async function Page() {}` |
| **Direct Database Query** | `await sql`SELECT * FROM invoices`; ` |
| **Parallel Requests** | `await Promise.all([fetch1(), fetch2()])` |
| **SQL with LIMIT** | `SELECT * FROM invoices LIMIT 10;` |
| **Count Query** | `SELECT COUNT(*) FROM invoices;` |

---

## Next Steps

You now understand:
- Three approaches to fetch data
- Why Server Components are recommended
- How to use SQL with postgres.js
- How to avoid request waterfalls with parallel fetching
- Best practices for efficient data fetching

The next chapter covers static and dynamic rendering, and revalidation strategies for optimization!

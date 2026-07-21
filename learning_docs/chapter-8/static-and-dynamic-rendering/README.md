# Chapter 8: Static and Dynamic Rendering

## Overview

This chapter covers two rendering strategies in Next.js: **Static Rendering** (build-time) and **Dynamic Rendering** (request-time). Understanding when to use each is crucial for performance.

---

## Static Rendering

### What is Static Rendering?

**Static Rendering** = Content is generated **once at build time** (during deployment) and cached for all users.

**Timeline:**
```
Deploy → Build time → HTML generated & cached → User visits → Serve cached HTML
```

### How It Works

1. Next.js builds your app (`next build`)
2. All pages are pre-rendered to static HTML
3. HTML is cached globally (e.g., on CDN)
4. Every user gets the same cached HTML

```typescript
// /app/dashboard/products/page.tsx
// ✅ This will be statically rendered
export default async function ProductsPage() {
  const products = await sql`SELECT * FROM products`;
  
  return (
    <div>
      {products.map(product => (
        <div key={product.id}>{product.name}</div>
      ))}
    </div>
  );
}
```

### Benefits of Static Rendering

✅ **Faster Websites**
- Pre-rendered HTML is cached globally
- Served from CDN locations worldwide
- Instant page loads for users

✅ **Reduced Server Load**
- No re-rendering per request
- Lower compute costs
- Better resource utilization

✅ **Better SEO**
- Complete HTML available to search engines
- Easier to crawl and index
- Improves search rankings

### When to Use Static Rendering

✅ Pages with **no personalized data**
✅ Pages that **update infrequently** (blog posts, documentation)
✅ Pages **shared across all users** (product pages, marketing)
✅ Public content with **stable data**

### Example: Blog Post Page

```typescript
// /app/blog/[slug]/page.tsx
export default async function BlogPost({ params }) {
  const post = await sql`
    SELECT * FROM posts 
    WHERE slug = ${params.slug}
  `;

  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
      <p>Published: {post.date}</p>
    </article>
  );
}
```

**Result:** Blog post is built once at deploy time, cached forever, fast for everyone ✅

---

## Dynamic Rendering

### What is Dynamic Rendering?

**Dynamic Rendering** = Content is generated **on each request** when the user visits the page.

**Timeline:**
```
User visits → Server generates HTML → Database queries → Return HTML to user
```

### How It Works

1. User requests a page
2. Next.js runs your component code on the server
3. Queries the database
4. Generates HTML
5. Sends to user

```typescript
// /app/dashboard/page.tsx
// ✅ This will be dynamically rendered
import { cookies } from 'next/headers';

export default async function DashboardPage() {
  const session = cookies().get('session'); // Request-time info
  
  const userInvoices = await sql`
    SELECT * FROM invoices 
    WHERE user_id = ${session.userId}
  `;
  
  return (
    <div>
      {userInvoices.map(invoice => (
        <div key={invoice.id}>${invoice.amount}</div>
      ))}
    </div>
  );
}
```

### What Triggers Dynamic Rendering

Dynamic rendering is triggered when you use functions that require request-time information:

| Function | When Used | Trigger |
|----------|-----------|---------|
| `cookies()` | Access user cookies | Always dynamic |
| `headers()` | Access HTTP headers | Always dynamic |
| `useSearchParams()` | Read URL parameters | Always dynamic |
| `searchParams` prop | Read query strings | Always dynamic |

### Benefits of Dynamic Rendering

✅ **Real-Time Data**
- Latest data displayed always
- Ideal for live dashboards
- Frequently updated content

✅ **Personalized Content**
- Show different data per user
- User-specific dashboards
- Personalized recommendations

✅ **Request-Time Information**
- Access cookies for authentication
- Read URL parameters
- Use headers for routing logic

### When to Use Dynamic Rendering

✅ Pages with **personalized data** (dashboards)
✅ Pages that **update frequently** (real-time apps)
✅ Pages with **user-specific content** (profiles)
✅ Pages that need **request-time info** (cookies, headers)

### Example: User Dashboard

```typescript
// /app/dashboard/page.tsx
import { cookies } from 'next/headers';

export default async function Dashboard() {
  const session = cookies().get('session').value;
  
  // Fetch user-specific data
  const userStats = await sql`
    SELECT * FROM stats 
    WHERE user_id = ${getUserIdFromSession(session)}
  `;

  return (
    <div>
      <h1>Your Dashboard</h1>
      <p>Total Invoices: {userStats.invoiceCount}</p>
      <p>Revenue: ${userStats.totalRevenue}</p>
    </div>
  );
}
```

**Result:** Page renders fresh for each user, always shows latest data ✅

---

## The Performance Challenge

### The Problem with Dynamic Rendering

> **Your application is only as fast as your slowest data fetch.**

When you dynamically render a page, users must wait for ALL data fetches to complete before the page loads.

### Example: Slow Data Fetch Blocking the Page

```typescript
// /app/dashboard/page.tsx
export default async function Dashboard() {
  // Fetch 1: Takes 1 second
  const revenue = await fetchRevenue();
  
  // Fetch 2: Takes 3 seconds ⚠️ This one is slow!
  const invoices = await fetchLatestInvoices();
  
  // Fetch 3: Takes 1 second
  const cardData = await fetchCardData();
  
  // User must wait 3 seconds before seeing ANY content
  
  return (
    <div>
      <RevenueChart data={revenue} />
      <InvoiceList data={invoices} />
      <CardStats data={cardData} />
    </div>
  );
}
```

**Timeline:**
```
Request → Fetch revenue (1s) → Fetch invoices (3s) ⚠️ → Fetch stats (1s)
Total: 5 seconds for user to see page
```

### Real Example: Simulating Slow Fetch

```typescript
// /app/lib/data.ts
export async function fetchRevenue() {
  console.log('Fetching revenue data...');
  
  // Simulate slow API/database query
  await new Promise((resolve) => setTimeout(resolve, 3000));
  
  const data = await sql`SELECT * FROM revenue`;
  console.log('Data fetch completed after 3 seconds.');
  
  return data;
}
```

**Problem:** One slow function blocks the entire page.

---

## Static vs Dynamic Comparison

| Factor | Static | Dynamic |
|--------|--------|---------|
| **Rendering Time** | Build time | Request time |
| **Cache** | Yes (CDN) | No |
| **Speed** | ⚡ Very fast | Depends on data |
| **Data Freshness** | Stale | Real-time |
| **Personalization** | No | Yes |
| **Best For** | Content pages | Dashboards |

### Decision Tree

```
Does page need personalized data?
├─ NO  → Static Rendering ✅
└─ YES → Does it update frequently?
         ├─ NO  → Static + Revalidation
         └─ YES → Dynamic Rendering ✅
```

---

## Combining Both Approaches

### Strategy: Static + Dynamic Sections

You can use **static rendering for the layout** and **dynamic rendering for specific sections**:

```typescript
// /app/dashboard/page.tsx
import { Suspense } from 'react';
import StaticHeader from '@/app/ui/header'; // Static
import DynamicInvoices from '@/app/ui/invoices'; // Dynamic

export default async function Dashboard() {
  return (
    <div>
      {/* Static - same for everyone */}
      <StaticHeader />
      
      {/* Dynamic - personalized per user */}
      <Suspense fallback={<div>Loading...</div>}>
        <DynamicInvoices />
      </Suspense>
    </div>
  );
}
```

---

## How to Check If Page Is Static or Dynamic

### Check Build Output

Run `next build` and look for symbols:

```
● /dashboard                     GET        Static
○ /dashboard/[id]                GET        Dynamic  
● /blog/[slug]                   GET        Static
```

**Legend:**
- `●` = Static Rendering
- `○` = Dynamic Rendering

### Console Messages

Dynamic pages show console logs on each request:
```
Fetching revenue data...
Data fetch completed after 3 seconds.
```

Static pages don't show logs after first build.

---

## Performance Impact Examples

### Static Rendering
```
First page load: 500ms (build time)
Subsequent loads: 50ms (from cache) ⚡
```

### Dynamic Rendering (with slow fetch)
```
Every page load: 3000ms (wait for slow query) ⚠️
```

### Result
Static rendering is **60x faster** than dynamic rendering with a 3-second query.

---

## Best Practices

✅ **Use Static Rendering by default**
- Faster for users
- Lower server costs
- Better SEO

✅ **Use Dynamic Rendering when needed**
- User-specific data required
- Real-time updates needed
- Request-time info (cookies) needed

✅ **Combine both**
- Static layout, dynamic sections
- Use Suspense for loading states

❌ **Avoid slow dynamic pages**
- If you must use dynamic rendering, optimize data fetches
- Use parallel requests with `Promise.all()`
- Implement streaming (Chapter 9)

---

## Common Scenarios

### Scenario 1: Marketing Website
```
Pages: Home, About, Pricing, Blog
→ Static Rendering ✅
(Same content for everyone, rarely changes)
```

### Scenario 2: User Dashboard
```
Pages: Dashboard, Invoices, Customers
→ Dynamic Rendering ✅
(Personalized per user, updates frequently)
```

### Scenario 3: Blog with Comments
```
Layout: Static
Comments: Dynamic
→ Mix both ✅
(Post content cached, comments always fresh)
```

---

## Next Steps

You now understand:
- **Static Rendering** - Fast, cached, SEO-friendly (best default)
- **Dynamic Rendering** - Real-time, personalized (when needed)
- **The performance challenge** - Slow fetches block dynamic pages
- **How to choose** - Static for content, dynamic for dashboards

**Next Chapter: Streaming**
- Solves the slow fetch problem
- Allows partial page rendering
- Shows content progressively as data loads
- Best of both worlds! 🚀

---

## Quick Reference

| Concept | How It Works |
|---------|-------------|
| **Static** | Build → Render → Cache → Serve cached HTML |
| **Dynamic** | Request → Render → Query → Return HTML |
| **Trigger Dynamic** | Use `cookies()`, `headers()`, `searchParams` |
| **Slower Fetch Blocks** | One slow query blocks entire page |

---

## Checklist

- [ ] Understand static rendering benefits (speed, SEO, cost)
- [ ] Understand dynamic rendering use cases (personalization, real-time)
- [ ] Know what triggers dynamic rendering
- [ ] Can identify slow fetch performance issues
- [ ] Know how to choose between static and dynamic

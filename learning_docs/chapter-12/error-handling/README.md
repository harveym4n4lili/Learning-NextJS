# Chapter 12: Error Handling

## Overview

This chapter covers how to handle errors gracefully in Next.js using **error boundaries** and special files. Proper error handling improves user experience by showing helpful messages instead of crashing pages.

---

## The Problem: Unhandled Errors

**Without error handling:**
```
User does something
  ↓
Application crashes
  ↓
Blank page or browser error
  ↓
User is confused 😞
```

**With error handling:**
```
User does something
  ↓
Error occurs
  ↓
Fallback UI shown with helpful message
  ↓
User can retry or navigate away ✅
```

---

## Error Handling Mechanisms

Next.js provides three main ways to handle errors:

| Mechanism | Type | Use Case |
|-----------|------|----------|
| **error.tsx** | Client Component | Catch unexpected errors |
| **not-found.tsx** | UI file | Handle 404 (resource not found) |
| **try/catch** | Code pattern | Database/API errors in Server Actions |

---

## Part 1: error.tsx - Unexpected Errors

### What is error.tsx?

An **error.tsx** file is a Client Component that wraps a route segment and acts as an **error boundary**.

**Key points:**
- Must be a Client Component (`'use client'`)
- Catches unexpected errors in the segment
- Provides a fallback UI
- Includes a `reset()` function to retry

### Creating an error.tsx File

**File:** `/app/dashboard/invoices/error.tsx`

```typescript
'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Log error for debugging (runs on client)
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex h-full flex-col items-center justify-center">
      <h2 className="text-center text-xl font-semibold text-red-600">
        Something went wrong!
      </h2>
      
      <p className="mt-2 text-center text-gray-600">
        {error.message || 'An unexpected error occurred.'}
      </p>
      
      <button
        onClick={() => reset()}
        className="mt-4 rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
      >
        Try again
      </button>
    </main>
  );
}
```

### Error Component Props

```typescript
export default function Error({
  error,      // JavaScript Error object with message and stack
  reset,      // Function to reset error boundary and retry
}: {
  error: Error & { digest?: string };
  reset: () => void;
})
```

**`error` object:**
- Contains error message and stack trace
- `digest` property uniquely identifies the error (for logging)
- Can be logged to error tracking service

**`reset()` function:**
- Retries rendering the route segment
- Called when user clicks "Try again" button
- Clears the error and shows page again

### How error.tsx Works

```
User visits /dashboard/invoices
  ↓
Component throws error
  ↓
error.tsx catches it
  ↓
Fallback UI shown (error message + retry button)
  ↓
User clicks "Try again"
  ↓
reset() called
  ↓
Page re-renders
```

### Folder Structure

```
/dashboard
├── error.tsx              (Catches errors in this segment)
└── /invoices
    ├── page.tsx
    ├── error.tsx          (Catches errors in invoices only)
    └── /[id]
        └── error.tsx      (Catches errors for specific invoice)
```

**Scope:**
- `error.tsx` in `/invoices` catches errors in invoices route
- Nested `error.tsx` catches errors in specific child routes
- Errors bubble up until caught by an `error.tsx`

---

## Part 2: not-found() & not-found.tsx - 404 Errors

### What is a 404?

A **404** error means a resource doesn't exist (e.g., user requests an invoice that was deleted).

**When to use:**
- Resource doesn't exist in database
- User ID is invalid
- Page doesn't exist

### Using notFound() Function

**File:** `/app/dashboard/invoices/[id]/page.tsx`

```typescript
import { fetchInvoiceById } from '@/app/lib/data';
import { notFound } from 'next/navigation';

export default async function Page(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const invoice = await fetchInvoiceById(params.id);

  // Check if invoice exists
  if (!invoice) {
    // Trigger 404 error
    notFound();
  }

  // Render invoice if found
  return (
    <div>
      <h1>{invoice.customer_name}</h1>
      <p>${invoice.amount}</p>
    </div>
  );
}
```

**What happens:**
1. Check if resource exists
2. If not, call `notFound()`
3. User sees 404 page instead of error

### Creating not-found.tsx

**File:** `/app/dashboard/invoices/[id]/not-found.tsx`

```typescript
import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex h-full flex-col items-center justify-center gap-4">
      <div className="text-center">
        <h2 className="text-4xl font-bold text-gray-800">404</h2>
        <h3 className="text-xl font-semibold text-gray-700 mt-2">
          Invoice Not Found
        </h3>
        <p className="text-gray-600 mt-2">
          The invoice you're looking for doesn't exist or has been deleted.
        </p>
      </div>

      <Link
        href="/dashboard/invoices"
        className="mt-4 rounded-md bg-blue-500 px-6 py-2 text-white hover:bg-blue-600"
      >
        Go Back to Invoices
      </Link>
    </main>
  );
}
```

### Error Precedence

**Important:** `notFound()` takes precedence over `error.tsx`

```
Unexpected error → error.tsx shows
Resource not found → not-found.tsx shows (even if error.tsx exists)
```

**Example:**
```
/dashboard/invoices/999
  ↓
Invoice with ID 999 doesn't exist
  ↓
notFound() called
  ↓
not-found.tsx shown (NOT error.tsx)
```

---

## Part 3: try/catch in Server Actions

### Why try/catch for Server Actions?

Server Actions interact with the database, which can fail:
- Database connection lost
- Validation errors
- Duplicate records
- Permission errors

### try/catch Pattern

**File:** `/app/lib/actions.ts`

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function deleteInvoice(id: string) {
  try {
    // Attempt to delete
    await sql`DELETE FROM invoices WHERE id = ${id}`;
    
    // Clear cache if successful
    revalidatePath('/dashboard/invoices');
    
  } catch (error) {
    // Catch and handle error
    console.error('Failed to delete invoice:', error);
    
    // Return error message to client
    return {
      message: 'Failed to delete invoice. Please try again.',
      success: false,
    };
  }
}
```

**What happens:**
1. Try to execute database operation
2. If successful, revalidate and return
3. If error, catch it and return error message
4. Client receives error and can show it to user

### Important: Redirect Outside try/catch

**⚠️ Critical rule:** Call `redirect()` OUTSIDE the try/catch block!

```typescript
// ❌ WRONG - redirect() will be caught by catch
export async function createInvoice(formData: FormData) {
  try {
    await sql`INSERT INTO invoices (...)`;
    redirect('/dashboard/invoices');  // Gets caught!
  } catch (error) {
    return { message: 'Error' };
  }
}

// ✅ CORRECT - redirect() is outside try/catch
export async function createInvoice(formData: FormData) {
  try {
    await sql`INSERT INTO invoices (...)`;
  } catch (error) {
    return { message: 'Error' };
  }
  
  // Redirect after try/catch
  redirect('/dashboard/invoices');
}
```

**Why?** `redirect()` works by throwing an error. If it's inside try/catch, the catch block catches it!

### Complete Server Action with Error Handling

```typescript
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const FormSchema = z.object({
  customerId: z.string(),
  amount: z.coerce.number().gt(0),
  status: z.enum(['pending', 'paid']),
});

export async function createInvoice(formData: FormData) {
  // Validate input
  const validatedFields = FormSchema.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  // Check validation
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing or invalid fields.',
    };
  }

  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];

  // Try database operation
  try {
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
  } catch (error) {
    console.error('Database Error:', error);
    return {
      message: 'Database error: failed to create invoice.',
    };
  }

  // Revalidate cache
  revalidatePath('/dashboard/invoices');

  // Redirect (OUTSIDE try/catch)
  redirect('/dashboard/invoices');
}
```

---

## Error Handling Strategies

### Strategy 1: Graceful Degradation

Show partial content even if some data fails:

```typescript
// /dashboard/page.tsx
import { Suspense } from 'react';

export default async function Dashboard() {
  return (
    <main>
      {/* Chart might error, but show with fallback */}
      <Suspense fallback={<ChartSkeleton />}>
        <Chart />
      </Suspense>

      {/* Table might error, but show with fallback */}
      <Suspense fallback={<TableSkeleton />}>
        <Table />
      </Suspense>
    </main>
  );
}
```

**Result:** If chart fails, table still shows (and vice versa)

### Strategy 2: Nested Error Boundaries

Catch errors at different levels:

```
Root error.tsx (catches all)
  ↓
/dashboard error.tsx (catches dashboard errors)
  ↓
/dashboard/invoices error.tsx (catches invoice errors)
  ↓
Component-level Suspense (catches component errors)
```

**Result:** Most specific error handler catches the error

### Strategy 3: Error Logging

Send errors to tracking service:

```typescript
'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Send to error tracking service (Sentry, LogRocket, etc.)
    console.error('Error logged:', {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}
```

---

## Common Error Scenarios

### Scenario 1: Database Query Fails

```typescript
// /app/dashboard/invoices/page.tsx
export default async function InvoicesPage() {
  const invoices = await fetchInvoices();  // Throws error if DB fails
  return <InvoicesTable invoices={invoices} />;
}

// /app/dashboard/invoices/error.tsx catches this
```

**Result:** error.tsx shows fallback UI

### Scenario 2: Resource Not Found

```typescript
// /app/dashboard/invoices/[id]/page.tsx
export default async function InvoicePage(props) {
  const params = await props.params;
  const invoice = await fetchInvoiceById(params.id);

  if (!invoice) {
    notFound();  // Triggers not-found.tsx
  }

  return <InvoiceDetail invoice={invoice} />;
}

// /app/dashboard/invoices/[id]/not-found.tsx shows 404
```

**Result:** not-found.tsx shows 404 page

### Scenario 3: Form Submission Error

```typescript
// /app/lib/actions.ts
export async function createInvoice(formData: FormData) {
  try {
    await sql`INSERT INTO invoices (...)`;
  } catch (error) {
    return { error: 'Failed to create invoice' };  // Return error
  }
  redirect('/dashboard/invoices');
}

// Form can display error message to user
```

**Result:** Error message shows on form

---

## Best Practices

✅ **Always use error.tsx** in route segments  
✅ **Check for null/undefined** and use `notFound()`  
✅ **Use try/catch in Server Actions** for database calls  
✅ **Put redirect() outside try/catch** blocks  
✅ **Show user-friendly error messages** (not DB details)  
✅ **Log errors for debugging** (digest, stack trace)  
✅ **Use Suspense with fallbacks** for granular error handling  
✅ **Create specific error pages** (not-found.tsx)  

❌ **Don't** expose database errors to users  
❌ **Don't** forget to handle validation errors  
❌ **Don't** put redirect() inside try/catch  
❌ **Don't** leave errors unhandled  
❌ **Don't** show technical stack traces in production  
❌ **Don't** ignore console errors in development  

---

## Error Handling Checklist

- [ ] Create `error.tsx` in route segments
- [ ] Create `not-found.tsx` for 404 pages
- [ ] Use `notFound()` when resources don't exist
- [ ] Add try/catch to Server Actions
- [ ] Put `redirect()` outside try/catch
- [ ] Validate input before database operations
- [ ] Return user-friendly error messages
- [ ] Log errors with digest for debugging
- [ ] Test error scenarios in development
- [ ] Add error boundaries for critical components

---

## Quick Reference

| File | Purpose | Type |
|------|---------|------|
| `error.tsx` | Catch unexpected errors | Client Component |
| `not-found.tsx` | Handle 404 errors | Regular Component |
| `try/catch` | Database error handling | Server Action pattern |

### Error.tsx Props

```typescript
{
  error: Error & { digest?: string }  // Error object
  reset: () => void                    // Retry function
}
```

### notFound() Usage

```typescript
if (!resource) {
  notFound();  // Shows not-found.tsx
}
```

### Server Action Error Pattern

```typescript
try {
  // Database operation
} catch (error) {
  return { message: 'Error message' };
}
// redirect() here (outside try/catch)
```

---

## Next Steps

You now understand:
- **error.tsx** - Catch unexpected errors with fallback UI
- **not-found.tsx** - Handle 404 errors when resources don't exist
- **try/catch** - Database error handling in Server Actions
- **Redirect rules** - Why `redirect()` must be outside try/catch
- **Error strategies** - Graceful degradation and error logging
- **Best practices** - How to handle errors gracefully

Error handling improves both user experience and developer debugging! 🚀

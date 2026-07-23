# Chapter 11: Mutating Data - Creating Records

## Overview

This chapter covers how to **create new records** in your database using **React Server Actions** combined with HTML forms. Server Actions allow you to run server-side code securely without building API routes.

---

## The Problem: Creating Data Without Server Actions

Traditional approach (bad):

```typescript
// ❌ Need API route
// POST /api/invoices

// ❌ Form submission to external endpoint
// ❌ Complex state management
// ❌ Error handling in client code
// ❌ Doesn't work without JavaScript
```

**Better approach (Server Actions):**

```typescript
// ✅ Server Action handles creation
// ✅ Form works without JavaScript
// ✅ Type-safe validation
// ✅ Direct database access
// ✅ Automatic cache revalidation
```

---

## What Are Server Actions?

**Server Actions** are asynchronous functions that run **only on the server**.

**Key characteristics:**
✅ Defined with `'use server'` directive  
✅ Can access database directly  
✅ Keep secrets safe (never exposed to client)  
✅ Can be called from forms with `action` attribute  
✅ Work even without JavaScript  

---

## Step 1: Create a Route for the Form

Create a page that displays a form for creating new invoices.

**File:** `/app/dashboard/invoices/create/page.tsx`

```typescript
import Form from '@/app/ui/invoices/create-form';
import Breadcrumbs from '@/app/ui/invoices/breadcrumbs';
import { fetchCustomers } from '@/app/lib/data';

export default async function Page() {
  // Fetch customers to populate dropdown
  const customers = await fetchCustomers();

  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Invoices', href: '/dashboard/invoices' },
          {
            label: 'Create Invoice',
            href: '/dashboard/invoices/create',
            active: true,
          },
        ]}
      />
      <Form customers={customers} />
    </main>
  );
}
```

**What this does:**
1. Fetches available customers from database
2. Renders breadcrumb navigation
3. Passes customers to form component

---

## Step 2: Create a Server Action

Define a Server Action that handles form submission and creates the record.

**File:** `/app/lib/actions.ts`

```typescript
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

// Define form schema for validation
const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer.',
  }),
  amount: z.coerce.number().gt(0, {
    message: 'Please enter an amount greater than $0.',
  }),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status.',
  }),
  date: z.string(),
});

// Create schema without auto-generated fields
const CreateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(formData: FormData) {
  // Validate form data
  const { customerId, amount, status } = CreateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  // Convert amount to cents for database storage
  const amountInCents = amount * 100;

  // Create date in YYYY-MM-DD format
  const date = new Date().toISOString().split('T')[0];

  try {
    // Insert into database
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to create invoice.');
  }

  // Clear cache for invoices page
  revalidatePath('/dashboard/invoices');

  // Redirect user back to invoices list
  redirect('/dashboard/invoices');
}
```

### What This Does

1. **Validates Input** - Zod schema checks all required fields
2. **Transforms Data** - Converts amounts to cents, generates date
3. **Inserts into Database** - Uses SQL to create new record
4. **Clears Cache** - `revalidatePath()` refreshes the page data
5. **Redirects User** - Takes them back to the list

---

## Step 3: Create the Form Component

Create a form that connects to the Server Action.

**File:** `/app/ui/invoices/create-form.tsx`

```typescript
'use client';

import Link from 'next/link';
import { Button } from '@/app/ui/button';
import { createInvoice } from '@/app/lib/actions';

export default function Form({
  customers,
}: {
  customers: CustomerField[];
}) {
  return (
    <form action={createInvoice}>
      <div className="space-y-4">
        {/* Customer Selection */}
        <div>
          <label htmlFor="customerId" className="block text-sm font-medium">
            Choose customer
          </label>
          <select
            id="customerId"
            name="customerId"
            className="block w-full rounded-md border px-3 py-2"
            required
          >
            <option value="">Select a customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </div>

        {/* Amount Input */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium">
            Enter amount
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            placeholder="Enter USD amount"
            step="0.01"
            className="block w-full rounded-md border px-3 py-2"
            required
          />
        </div>

        {/* Status Selection */}
        <fieldset>
          <legend className="block text-sm font-medium">Set the invoice status</legend>
          <div className="mt-2 space-y-2">
            <div className="flex items-center">
              <input
                id="pending"
                name="status"
                type="radio"
                value="pending"
                className="mr-2"
                required
              />
              <label htmlFor="pending" className="text-sm">
                Pending
              </label>
            </div>
            <div className="flex items-center">
              <input
                id="paid"
                name="status"
                type="radio"
                value="paid"
                className="mr-2"
                required
              />
              <label htmlFor="paid" className="text-sm">
                Paid
              </label>
            </div>
          </div>
        </fieldset>
      </div>

      {/* Form Actions */}
      <div className="mt-6 flex justify-end gap-4">
        <Link
          href="/dashboard/invoices"
          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
        >
          Cancel
        </Link>
        <Button type="submit">Create Invoice</Button>
      </div>
    </form>
  );
}
```

**Key points:**
- `action={createInvoice}` connects form to Server Action
- Form inputs have `name` attributes matching Server Action parameters
- No JavaScript needed for basic form submission
- Form fields are validated on server

---

## Understanding the Data Flow

### Form Submission Flow

```
User fills form
      ↓
User clicks "Create Invoice"
      ↓
Browser sends FormData to Server Action
      ↓
createInvoice(formData) runs on server
      ↓
Zod validates: customerId, amount, status
      ↓
Transform: Convert amount to cents, create date
      ↓
INSERT into database
      ↓
revalidatePath() clears cache
      ↓
redirect() sends user back to invoices list
      ↓
Page refreshes showing new invoice
```

---

## Key Concepts Explained

### 1. Zod Schema Validation

**Purpose:** Validate and transform form data before database insertion

```typescript
const FormSchema = z.object({
  customerId: z.string({
    invalid_type_error: 'Please select a customer.',
  }),
  amount: z.coerce.number().gt(0, {
    message: 'Please enter an amount greater than $0.',
  }),
  status: z.enum(['pending', 'paid']),
});
```

**What each part does:**
- `z.string()` - Expects string value
- `z.coerce.number()` - Converts string to number
- `.gt(0)` - Must be greater than 0
- `z.enum()` - Must be one of specified values

**Using `.omit()`:**
```typescript
const CreateInvoice = FormSchema.omit({ id: true, date: true });
```
Removes `id` (auto-generated) and `date` (created by server)

### 2. FormData Extraction

HTML form submission sends data as `FormData` object:

```typescript
export async function createInvoice(formData: FormData) {
  // Extract values by input name
  const customerId = formData.get('customerId');  // From <select name="customerId">
  const amount = formData.get('amount');          // From <input name="amount">
  const status = formData.get('status');          // From <input name="status">
}
```

### 3. Money Precision

**Always store currency as cents (integers):**

```typescript
// ❌ Bad - decimal precision issues
const amount = 99.99;
database.insert(amount);

// ✅ Good - integer precision
const amountInCents = 99.99 * 100;  // 9999 cents
database.insert(amountInCents);
```

**Why?** Floating point math is imprecise. Cents are integers and exact.

### 4. Cache Revalidation

After creating a new record, clear the cache so users see updated data:

```typescript
revalidatePath('/dashboard/invoices');
```

**What this does:**
- Clears Next.js cache for that route
- Next time page loads, data is fetched fresh
- Users see the newly created invoice

### 5. Redirect After Creation

Send user back to the list after successful creation:

```typescript
redirect('/dashboard/invoices');
```

**Benefits:**
- ✅ Good UX - shows user the action succeeded
- ✅ Prevents duplicate submissions
- ✅ User sees new record in list

---

## Complete Example: Create Invoice

### 1. User navigates to `/dashboard/invoices/create`
```
Server renders create page.tsx
  ↓
Fetches customers from database
  ↓
Renders form with customer options
```

### 2. User fills form and clicks "Create Invoice"
```
Browser submits form to createInvoice Server Action
  ↓
Server validates all fields with Zod
  ↓
Transform: amount→cents, generate date
  ↓
INSERT INTO invoices (...)
  ↓
revalidatePath('/dashboard/invoices')
  ↓
redirect('/dashboard/invoices')
```

### 3. Browser navigates to invoices list
```
Page refreshes
  ↓
New invoice appears in table
```

---

## Error Handling

### Basic Error Handling

```typescript
export async function createInvoice(formData: FormData) {
  try {
    // Validate
    const validated = CreateInvoice.parse({
      customerId: formData.get('customerId'),
      amount: formData.get('amount'),
      status: formData.get('status'),
    });

    // Insert
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${validated.customerId}, ${validated.amount}, ${validated.status}, ${new Date().toISOString().split('T')[0]})
    `;

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
  } catch (error) {
    // Log error for debugging
    console.error('Failed to create invoice:', error);
    
    // Show generic error to user (don't expose database details)
    throw new Error('Failed to create invoice.');
  }
}
```

---

## Best Practices

✅ **Use Zod for validation** - Type-safe, detailed error messages  
✅ **Store money as cents** - Avoid floating point precision issues  
✅ **Generate timestamps on server** - Consistent date/time  
✅ **Use revalidatePath()** - Keep cache in sync  
✅ **Redirect after success** - Good UX, prevent duplicates  
✅ **Handle errors gracefully** - Log details, show generic message  
✅ **Use Server Actions** - No API routes needed  

❌ **Don't** trust client-side validation alone  
❌ **Don't** store money as decimals  
❌ **Don't** forget revalidatePath()  
❌ **Don't** expose database errors to users  
❌ **Don't** use API routes for simple CRUD  

---

## Quick Reference

| Step | Component | Purpose |
|------|-----------|---------|
| **1. Route** | `/create/page.tsx` | Display form with customers |
| **2. Server Action** | `/lib/actions.ts` | Validate & insert data |
| **3. Form** | `/ui/create-form.tsx` | User input & submission |

### Server Action Flow

```typescript
formData → Validate (Zod) → Transform → Insert → Revalidate → Redirect
```

---

## Security Benefits

Server Actions provide built-in security:

✅ **Secrets stay on server** - Database connection never exposed  
✅ **Encrypted closures** - Cannot be intercepted or replayed  
✅ **Input validation** - Zod catches malformed data  
✅ **Type-safe** - TypeScript prevents wrong types  
✅ **Automatic CSRF protection** - Next.js handles CSRF tokens  
✅ **Works without JavaScript** - Progressive enhancement  

---

## Next Steps

You now understand:
- **Server Actions** - Run code securely on server
- **Form + Server Action** - Simple, no API routes needed
- **Zod validation** - Type-safe data validation
- **Data transformation** - Convert formats before database
- **Cache & redirect** - Update UI after creation
- **Security** - Why Server Actions are safe

Ready for UPDATE and DELETE operations in the next sections! 🚀

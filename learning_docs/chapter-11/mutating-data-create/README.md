# Chapter 11: Mutating Data (Create, Update, Delete)

## Overview

This chapter covers all database mutations using **React Server Actions**: creating new records, updating existing ones, and deleting records. Server Actions allow you to run server-side code securely without building API routes.

---

## Part 1: CREATE - Adding New Records

### The Problem: Creating Data Without Server Actions

Traditional approach (bad):

```typescript
// ❌ Need API route (POST /api/invoices)
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

### What Are Server Actions?

**Server Actions** are asynchronous functions that run **only on the server**.

**Key characteristics:**
✅ Defined with `'use server'` directive  
✅ Can access database directly  
✅ Keep secrets safe (never exposed to client)  
✅ Can be called from forms with `action` attribute  
✅ Work even without JavaScript  

### CREATE: Step 1 - Create a Route for the Form

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

### CREATE: Step 2 - Create Server Actions

Define Server Actions for all operations in one file.

**File:** `/app/lib/actions.ts`

```typescript
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

// Form validation schema
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

// For CREATE: omit auto-generated fields
const CreateInvoice = FormSchema.omit({ id: true, date: true });

// For UPDATE: omit auto-generated fields
const UpdateInvoice = FormSchema.omit({ id: true, date: true });

// ============================================================
// CREATE INVOICE
// ============================================================
export async function createInvoice(formData: FormData) {
  // Validate form data
  const { customerId, amount, status } = CreateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  // Convert amount to cents
  const amountInCents = amount * 100;

  // Create date in YYYY-MM-DD format
  const date = new Date().toISOString().split('T')[0];

  try {
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to create invoice.');
  }

  // Clear cache and redirect
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

// ============================================================
// UPDATE INVOICE
// ============================================================
export async function updateInvoice(id: string, formData: FormData) {
  // Validate form data
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  // Convert amount to cents
  const amountInCents = amount * 100;

  try {
    await sql`
      UPDATE invoices
      SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
      WHERE id = ${id}
    `;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to update invoice.');
  }

  // Clear cache and redirect
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

// ============================================================
// DELETE INVOICE
// ============================================================
export async function deleteInvoice(id: string) {
  try {
    await sql`DELETE FROM invoices WHERE id = ${id}`;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to delete invoice.');
  }

  // Clear cache (no redirect - user stays on page)
  revalidatePath('/dashboard/invoices');
}
```

### CREATE: Step 3 - Create the Form Component

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

---

## Part 2: UPDATE - Modifying Existing Records

### UPDATE: Step 1 - Create Edit Route

**File Structure:**
```
/invoices
  /[id]
    /edit
      page.tsx
```

**File:** `/app/dashboard/invoices/[id]/edit/page.tsx`

```typescript
import Form from '@/app/ui/invoices/edit-form';
import Breadcrumbs from '@/app/ui/invoices/breadcrumbs';
import { fetchInvoiceById, fetchCustomers } from '@/app/lib/data';

export default async function Page(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const id = params.id;

  // Fetch both in parallel
  const [invoice, customers] = await Promise.all([
    fetchInvoiceById(id),
    fetchCustomers(),
  ]);

  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Invoices', href: '/dashboard/invoices' },
          {
            label: 'Edit Invoice',
            href: `/dashboard/invoices/${id}/edit`,
            active: true,
          },
        ]}
      />
      <Form invoice={invoice} customers={customers} />
    </main>
  );
}
```

### UPDATE: Step 2 - Create Edit Form

**File:** `/app/ui/invoices/edit-form.tsx`

```typescript
'use client';

import Link from 'next/link';
import { Button } from '@/app/ui/button';
import { updateInvoice } from '@/app/lib/actions';

export default function EditInvoiceForm({
  invoice,
  customers,
}: {
  invoice: InvoiceForm;
  customers: CustomerField[];
}) {
  // Use .bind() to pass invoice ID without exposing it in HTML
  const updateInvoiceWithId = updateInvoice.bind(null, invoice.id);

  return (
    <form action={updateInvoiceWithId}>
      <div className="space-y-4">
        {/* Customer Selection - pre-populated */}
        <div>
          <label htmlFor="customerId" className="block text-sm font-medium">
            Choose customer
          </label>
          <select
            id="customerId"
            name="customerId"
            defaultValue={invoice.customer_id}
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

        {/* Amount - pre-populated */}
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
            defaultValue={invoice.amount}
            className="block w-full rounded-md border px-3 py-2"
            required
          />
        </div>

        {/* Status - pre-populated */}
        <fieldset>
          <legend className="block text-sm font-medium">Set the invoice status</legend>
          <div className="mt-2 space-y-2">
            <div className="flex items-center">
              <input
                id="pending"
                name="status"
                type="radio"
                value="pending"
                defaultChecked={invoice.status === 'pending'}
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
                defaultChecked={invoice.status === 'paid'}
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
        <Button type="submit">Update Invoice</Button>
      </div>
    </form>
  );
}
```

### Why Use `.bind()` for IDs?

```typescript
// ❌ Bad - ID exposed in HTML source
<input type="hidden" name="id" value={invoice.id} />

// ✅ Good - ID stays on server, encrypted
const updateInvoiceWithId = updateInvoice.bind(null, invoice.id);
```

**Benefits:**
- ID never appears in HTML
- Cannot be intercepted in network requests
- Encrypted in closures
- More secure

---

## Part 3: DELETE - Removing Records

### DELETE: Step 1 - Create Delete Button Component

**File:** `/app/ui/invoices/buttons.tsx`

```typescript
'use client';

import { deleteInvoice } from '@/app/lib/actions';
import { TrashIcon } from '@heroicons/react/24/outline';

export function DeleteInvoice({ id }: { id: string }) {
  // Use .bind() to pass invoice ID
  const deleteInvoiceWithId = deleteInvoice.bind(null, id);

  return (
    <form action={deleteInvoiceWithId}>
      <button
        type="submit"
        className="rounded-md border p-2 hover:bg-gray-100"
      >
        <span className="sr-only">Delete</span>
        <TrashIcon className="w-4" />
      </button>
    </form>
  );
}
```

### DELETE: Step 2 - Add Delete Button to Table

**File:** `/app/ui/invoices/table.tsx` (simplified)

```typescript
import { DeleteInvoice } from '@/app/ui/invoices/buttons';

export default async function InvoicesTable() {
  const invoices = await fetchFilteredInvoices(query, currentPage);

  return (
    <table>
      <tbody>
        {invoices.map((invoice) => (
          <tr key={invoice.id}>
            <td>{invoice.name}</td>
            <td>${invoice.amount}</td>
            <td>
              <DeleteInvoice id={invoice.id} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### DELETE Behavior

**Key points:**
- No redirect needed (user stays on page)
- `revalidatePath()` refreshes the table immediately
- Invoice disappears from list
- User sees instant feedback

---

## Complete Data Mutation Reference

### CREATE Flow

```
Form page (/create)
  ↓
User fills form & clicks "Create"
  ↓
createInvoice(formData) Server Action
  ↓
Validate with Zod
  ↓
INSERT INTO invoices
  ↓
revalidatePath() + redirect()
  ↓
User sees new invoice in list
```

### UPDATE Flow

```
Edit page (/[id]/edit)
  ↓
Form pre-populated with current data
  ↓
User changes fields & clicks "Update"
  ↓
updateInvoice(id, formData) Server Action
  ↓
Validate with Zod
  ↓
UPDATE invoices SET ...
  ↓
revalidatePath() + redirect()
  ↓
User sees updated invoice in list
```

### DELETE Flow

```
Table row with delete button
  ↓
User clicks delete icon
  ↓
Form submits to deleteInvoice(id)
  ↓
DELETE FROM invoices WHERE id = ${id}
  ↓
revalidatePath()
  ↓
Table refreshes immediately
  ↓
Invoice disappears from list
```

---

## Key Concepts

### 1. Zod Schema Validation

Validates all input before touching the database:

```typescript
const FormSchema = z.object({
  customerId: z.string({ invalid_type_error: 'Required' }),
  amount: z.coerce.number().gt(0),
  status: z.enum(['pending', 'paid']),
});
```

### 2. FormData Extraction

Forms send data as `FormData` object:

```typescript
export async function createInvoice(formData: FormData) {
  const customerId = formData.get('customerId');  // From <select>
  const amount = formData.get('amount');          // From <input>
  const status = formData.get('status');          // From <radio>
}
```

### 3. Money Precision (Cents)

Always store money as cents (integers), never decimals:

```typescript
const amountInCents = 99.99 * 100;  // 9999 cents
// Store 9999 in database, not 99.99
```

### 4. Cache Revalidation

Clear cache after mutations so users see updated data:

```typescript
revalidatePath('/dashboard/invoices');
```

### 5. Redirect After Create/Update

Send user back to list after successful mutation:

```typescript
redirect('/dashboard/invoices');
```

### 6. Passing IDs with `.bind()`

Keep sensitive IDs off the client:

```typescript
const updateInvoiceWithId = updateInvoice.bind(null, invoice.id);
<form action={updateInvoiceWithId}>
```

---

## Best Practices

✅ **Validate all input** - Use Zod for type-safe validation  
✅ **Store money as cents** - Avoid floating point precision issues  
✅ **Use `.bind()` for IDs** - Keep sensitive data off client  
✅ **Revalidate cache** - Keep UI in sync with database  
✅ **Use parameterized queries** - Prevents SQL injection  
✅ **Handle errors gracefully** - Log details, show generic message  
✅ **Pre-populate edit forms** - Show current values with `defaultValue`  
✅ **Use Server Actions** - No need for API routes  

❌ **Don't** trust client-side validation alone  
❌ **Don't** store money as decimals  
❌ **Don't** use hidden inputs for IDs (use `.bind()`)  
❌ **Don't** forget `revalidatePath()`  
❌ **Don't** expose database errors to users  
❌ **Don't** build API routes for simple CRUD  

---

## SQL Injection Prevention

Server Actions use parameterized queries automatically:

```typescript
// ✅ Safe - SQL injection prevented
await sql`DELETE FROM invoices WHERE id = ${id}`;

// ❌ Unsafe - Don't do this!
// const query = `DELETE FROM invoices WHERE id = '${id}'`;
```

The `sql` template literal automatically escapes all values.

---

## Error Handling Pattern

```typescript
export async function createInvoice(formData: FormData) {
  try {
    // Validate
    const validated = CreateInvoice.parse({...});
    
    // Insert
    await sql`INSERT INTO invoices (...)`;
    
    // Success
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
  } catch (error) {
    // Log for debugging
    console.error('Failed to create invoice:', error);
    
    // Show generic error (don't expose DB details)
    throw new Error('Failed to create invoice.');
  }
}
```

---

## Quick Reference

| Operation | Action | Redirect | Cache |
|-----------|--------|----------|-------|
| **CREATE** | `createInvoice()` | ✅ Yes | ✅ Revalidate |
| **UPDATE** | `updateInvoice(id)` | ✅ Yes | ✅ Revalidate |
| **DELETE** | `deleteInvoice(id)` | ❌ No | ✅ Revalidate |

---

## Security Benefits

Server Actions provide built-in protection:

✅ **Secrets stay on server** - Database connection never exposed  
✅ **Encrypted closures** - IDs passed via `.bind()` are encrypted  
✅ **Input validation** - Zod catches malformed data  
✅ **Type-safe** - TypeScript prevents wrong types  
✅ **Parameterized queries** - SQL injection prevention  
✅ **Automatic CSRF protection** - Next.js handles tokens  
✅ **Progressive enhancement** - Works without JavaScript  

---

## Next Steps

You now understand:
- **CREATE** - Adding new records with Server Actions
- **UPDATE** - Modifying existing records with pre-populated forms
- **DELETE** - Removing records from the database
- **Data flows** - How forms connect to Server Actions
- **Security** - Why Server Actions are safer than API routes
- **Cache management** - Keeping UI in sync with database

You now have complete CRUD (Create, Read, Update, Delete) operations! 🚀

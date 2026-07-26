# Chapter 13: Improving Accessibility & Server-Side Validation

## Overview

This chapter covers implementing server-side form validation using Zod and React's `useActionState` hook while maintaining accessibility standards with ARIA attributes and ESLint validation.

---

## Part 1: Three Foundational Form Accessibility Practices

Before adding validation, understand these built-in HTML accessibility features:

### 1. Semantic HTML
Use proper form elements instead of divs:
```typescript
// ✅ Good - semantic
<input type="text" />
<select>...</select>
<label htmlFor="id">Label</label>

// ❌ Bad - not semantic
<div role="textbox" />
<div role="combobox" />
```

### 2. Labelling with `htmlFor`
Connect labels to inputs for screen readers:
```typescript
// ✅ Good
<label htmlFor="customer">Choose customer</label>
<select id="customer" name="customerId">...</select>

// ❌ Bad - no connection
<label>Choose customer</label>
<select name="customerId">...</select>
```

### 3. Focus Outline Styling
Enable Tab key navigation and visible focus states:
```typescript
// ✅ Good - outline visible on focus
className="outline-2"

// ❌ Bad - no focus indication
className="outline-none"
```

---

## Part 2: Server-Side Validation with Zod

### Why Server-Side Validation?

✅ **Secure** - Prevents malicious client-side bypass  
✅ **Single source of truth** - One validation ruleset  
✅ **Data integrity** - Ensures correct format before DB insert  
✅ **User-friendly** - Display errors on form re-render  

### Zod Schema Definition

**File:** `/app/lib/actions.ts`

```typescript
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer.',
  }),
  amount: z.coerce
    .number()
    .gt(0, { message: 'Please enter an amount greater than $0.' }),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status.',
  }),
  date: z.string(),
});

// Omit auto-generated fields
const CreateInvoice = FormSchema.omit({ id: true, date: true });

// Define return state type
export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};
```

### Zod Validation Features

| Feature | Purpose | Example |
|---------|---------|---------|
| `z.string()` | String type | `z.string()` |
| `invalid_type_error` | Custom type error | `{ invalid_type_error: 'Required' }` |
| `z.coerce.number()` | Convert string to number | Input `"99.99"` → `99.99` |
| `.gt(0)` | Greater than validation | `.gt(0, { message: '...' })` |
| `z.enum()` | Restrict to values | `z.enum(['pending', 'paid'])` |
| `.omit()` | Remove fields from schema | `.omit({ id: true, date: true })` |

---

## Part 3: useActionState Hook

### How useActionState Works

The `useActionState` hook connects a form to a Server Action and manages validation state.

**Basic Pattern:**
```typescript
const [state, formAction] = useActionState(serverAction, initialState);
```

- **state** - Current form state with errors
- **formAction** - Function to pass to form's `action` attribute

### Implementation in Create Form

**File:** `/app/ui/invoices/create-form.tsx`

```typescript
'use client';

import { useActionState } from 'react';
import { createInvoice, State } from '@/app/lib/actions';

export default function Form({ customers }: { customers: CustomerField[] }) {
  // Initialize state
  const initialState: State = { message: null, errors: {} };
  
  // Connect to Server Action
  const [state, formAction] = useActionState(createInvoice, initialState);

  return (
    <form action={formAction}>
      {/* Form fields here */}
    </form>
  );
}
```

### Implementation in Edit Form

**File:** `/app/ui/invoices/edit-form.tsx`

```typescript
'use client';

import { useActionState } from 'react';
import { updateInvoice, State } from '@/app/lib/actions';

export default function EditInvoiceForm({
  invoice,
  customers,
}: {
  invoice: InvoiceForm;
  customers: CustomerField[];
}) {
  // Initialize state
  const initialState: State = { message: null, errors: {} };
  
  // Bind ID to Server Action
  const updateInvoiceWithId = updateInvoice.bind(null, invoice.id);
  
  // Connect to bound Server Action
  const [state, formAction] = useActionState(updateInvoiceWithId, initialState);

  return (
    <form action={formAction}>
      {/* Form fields here */}
    </form>
  );
}
```

---

## Part 4: Server Action with Validation

### Create Server Action

**File:** `/app/lib/actions.ts`

```typescript
export async function createInvoice(prevState: State, formData: FormData) {
  // Validate form data
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  // Return errors if validation fails
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.',
    };
  }

  // Extract validated data
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];

  // Insert into database
  try {
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
  } catch (error) {
    return {
      message: 'Database Error: Failed to Create Invoice.',
    };
  }

  // Success - revalidate and redirect
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}
```

### Update Server Action

```typescript
export async function updateInvoice(
  id: string,
  prevState: State,
  formData: FormData
) {
  // Validate form data
  const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  // Return errors if validation fails
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Update Invoice.',
    };
  }

  // Extract and transform data
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;

  // Update database
  try {
    await sql`
      UPDATE invoices
      SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
      WHERE id = ${id}
    `;
  } catch (error) {
    return {
      message: 'Database Error: Failed to Update Invoice.',
    };
  }

  // Success - revalidate and redirect
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}
```

---

## Part 5: Displaying Errors Accessibly with ARIA

### Three Essential ARIA Attributes

When displaying validation errors, use these ARIA attributes:

#### 1. `aria-describedby` - Link input to error container

Tells screen reader that an error description exists:
```typescript
<input
  id="customer"
  name="customerId"
  aria-describedby="customer-error"
/>
```

#### 2. `id` - Unique error container identifier

Must match the `aria-describedby` value:
```typescript
<div id="customer-error">
  {/* Error messages go here */}
</div>
```

#### 3. `aria-live` & `aria-atomic` - Announce error updates

Screen reader announces errors when they appear:
```typescript
<div
  id="customer-error"
  aria-live="polite"
  aria-atomic="true"
>
  {/* Errors announced to screen readers */}
</div>
```

- `aria-live="polite"` - Announce when user is idle (not interrupting)
- `aria-atomic="true"` - Announce entire content, not just changes

### Complete Form Field Pattern

```typescript
{/* Customer Name Field */}
<div className="mb-4">
  <label htmlFor="customer" className="mb-2 block text-sm font-medium">
    Choose customer
  </label>
  
  {/* Input with aria-describedby */}
  <div className="relative">
    <select
      id="customer"
      name="customerId"
      className="peer block w-full rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2"
      defaultValue=""
      aria-describedby="customer-error"
    >
      <option value="" disabled>
        Select a customer
      </option>
      {customers.map((customer) => (
        <option key={customer.id} value={customer.id}>
          {customer.name}
        </option>
      ))}
    </select>
    <UserCircleIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500" />
  </div>

  {/* Error display with ARIA attributes */}
  <div id="customer-error" aria-live="polite" aria-atomic="true">
    {state.errors?.customerId &&
      state.errors.customerId.map((error: string) => (
        <p className="mt-2 text-sm text-red-500" key={error}>
          {error}
        </p>
      ))}
  </div>
</div>
```

### Repeat for Amount Field

```typescript
<div className="mb-4">
  <label htmlFor="amount" className="mb-2 block text-sm font-medium">
    Choose an amount
  </label>
  <div className="relative">
    <input
      id="amount"
      name="amount"
      type="number"
      step="0.01"
      placeholder="Enter USD amount"
      className="peer block w-full rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2"
      aria-describedby="amount-error"
    />
    <CurrencyDollarIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500" />
  </div>
  <div id="amount-error" aria-live="polite" aria-atomic="true">
    {state.errors?.amount &&
      state.errors.amount.map((error: string) => (
        <p className="mt-2 text-sm text-red-500" key={error}>
          {error}
        </p>
      ))}
  </div>
</div>
```

### Repeat for Status Field

```typescript
<fieldset>
  <legend className="mb-2 block text-sm font-medium">
    Set the invoice status
  </legend>
  <div className="rounded-md border border-gray-200 bg-white px-[14px] py-3">
    <div className="flex gap-4">
      <div className="flex items-center">
        <input
          id="pending"
          name="status"
          type="radio"
          value="pending"
          aria-describedby="status-error"
        />
        <label htmlFor="pending">Pending</label>
      </div>
      <div className="flex items-center">
        <input
          id="paid"
          name="status"
          type="radio"
          value="paid"
          aria-describedby="status-error"
        />
        <label htmlFor="paid">Paid</label>
      </div>
    </div>
  </div>
  <div id="status-error" aria-live="polite" aria-atomic="true">
    {state.errors?.status &&
      state.errors.status.map((error: string) => (
        <p className="mt-2 text-sm text-red-500" key={error}>
          {error}
        </p>
      ))}
  </div>
</fieldset>
```

---

## Part 6: ESLint Accessibility Plugin

### Why ESLint for Accessibility?

ESLint catches common accessibility mistakes automatically:
- Missing `alt` text on images
- Incorrect ARIA attributes
- Missing labels on form inputs
- Improper `role` attributes

### Setup

**Install dependencies:**
```bash
pnpm add -D eslint eslint-config-next
```

**File:** `/eslint.config.mjs`

```javascript
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

const eslintConfig = defineConfig([
  ...nextVitals,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);

export default eslintConfig;
```

**File:** `package.json`

```json
{
  "scripts": {
    "lint": "eslint ."
  }
}
```

### Running ESLint

```bash
pnpm lint
```

### Example Warning

```
./app/ui/invoices/table.tsx
45:25  Warning: Image elements must have an alt prop,
either with meaningful text, or an empty string for decorative images. jsx-a11y/alt-text
```

Fix by adding alt text:
```typescript
// ❌ Before
<Image src={imageUrl} />

// ✅ After
<Image src={imageUrl} alt="Invoice details" />
```

---

## Complete Implementation Flow

1. **Client Component** - Import `useActionState` and initialize state
2. **Zod Schema** - Define validation rules with custom error messages
3. **Server Action** - Use `safeParse()` to validate, return errors early
4. **Form Fields** - Add `aria-describedby` to connect inputs to errors
5. **Error Display** - Use `aria-live` and `aria-atomic` for announcements
6. **ESLint** - Run linter to catch accessibility issues

---

## Best Practices Checklist

✅ **Form Structure**
- [ ] Use semantic HTML (`<input>`, `<select>`, `<label>`)
- [ ] Label every form field with `htmlFor` attribute
- [ ] Enable Tab key navigation with proper focus styling

✅ **Validation**
- [ ] Define Zod schema with custom error messages
- [ ] Use `safeParse()` to validate without throwing
- [ ] Return validation errors separately from database errors
- [ ] Display all validation errors to the user

✅ **Accessibility**
- [ ] Add `aria-describedby` to inputs linking to error IDs
- [ ] Use `aria-live="polite"` for error announcements
- [ ] Use `aria-atomic="true"` to announce entire error
- [ ] Ensure proper focus outline visibility
- [ ] Test with Tab key navigation

✅ **ESLint**
- [ ] Run `pnpm lint` before committing
- [ ] Fix all accessibility warnings
- [ ] Use ESLint in CI/CD pipeline

---

## Quick Reference

| Hook | Purpose |
|------|---------|
| `useActionState(action, initialState)` | Connect form to Server Action |

| Attribute | Purpose |
|-----------|---------|
| `aria-describedby="id"` | Links input to error description |
| `id="error-id"` | Unique ID for error container |
| `aria-live="polite"` | Announce changes politely |
| `aria-atomic="true"` | Announce entire element |

| Zod Method | Purpose |
|-----------|---------|
| `safeParse()` | Validate without throwing |
| `flatten().fieldErrors` | Extract field-level errors |
| `z.coerce.number()` | Convert string to number |
| `.gt(0)` | Validate > 0 |
| `z.enum()` | Restrict to specific values |

---

## Next Steps

You now understand:
- ✅ Three foundational form accessibility practices
- ✅ Zod schema validation with custom messages
- ✅ useActionState hook for form state management
- ✅ Server-side validation in Server Actions
- ✅ ARIA attributes for accessible error display
- ✅ ESLint for catching accessibility issues

Forms are now **secure, accessible, and user-friendly**! 🚀

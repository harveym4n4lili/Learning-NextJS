# Chapter 14: Adding Authentication

## Overview

This chapter covers implementing secure authentication in a Next.js dashboard using NextAuth.js, protecting routes with middleware, and managing user sessions.

---

## Part 1: Authentication vs Authorization

### Authentication
**Verifies user identity** - "Who are you?"

Examples:
- Username & password login
- Two-factor authentication (2FA)
- Social login (Google, GitHub)
- Biometric authentication

### Authorization
**Determines access permissions** - "What can you do?"

Examples:
- Admin users can delete content
- Users can only edit their own profile
- Subscribers see premium features

**In this chapter:** We implement authentication. Authorization comes later with route protection.

---

## Part 2: NextAuth.js Setup

### Why NextAuth.js?

✅ **Secure** - Handles password hashing and session management  
✅ **Flexible** - Supports multiple auth providers  
✅ **Simple** - Minimal configuration needed  
✅ **Production-ready** - Battle-tested in thousands of apps  

### Step 1: Installation

```bash
pnpm i next-auth@beta
```

**Note:** The beta version is required for Next.js 14+ compatibility.

### Step 2: Generate Secret Key

The secret key encrypts session data. Generate one:

**macOS/Linux:**
```bash
openssl rand -base64 32
```

**Windows:**
Visit https://generate-secret.vercel.app/32

Add to `.env.local`:
```env
AUTH_SECRET=your-generated-secret-key-here
```

**⚠️ Important:** Keep `AUTH_SECRET` secret! Never commit to git.

---

## Part 3: Authentication Configuration

### Auth Config File (`auth.config.ts`)

This file defines authentication behavior and route protection.

**File:** `auth.config.ts`

```typescript
import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  // Redirect unauthenticated users to login page
  pages: {
    signIn: '/login',
  },
  
  // Protect routes and handle redirects
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      // Check if user is logged in
      const isLoggedIn = !!auth?.user;
      
      // Check if accessing protected dashboard
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      
      if (isOnDashboard) {
        // Require login to access dashboard
        return isLoggedIn;
      } else if (isLoggedIn) {
        // Redirect logged-in users from login page to dashboard
        return Response.redirect(new URL('/dashboard', nextUrl));
      }
      
      // Allow access to login page
      return true;
    },
  },
  
  // Auth providers (configured in auth.ts)
  providers: [],
} satisfies NextAuthConfig;
```

**What this does:**
1. Redirects unauthenticated users to `/login`
2. Prevents logged-in users from accessing login page
3. Protects dashboard routes (must be logged in)
4. Allows public access to login page

---

## Part 4: Route Protection with Middleware

### Middleware File (`middleware.ts` or `proxy.ts`)

Middleware runs **before rendering** - it's the first layer of protection.

**File:** `proxy.ts` (or `middleware.ts`)

```typescript
import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

// Export NextAuth as middleware
export default NextAuth(authConfig).auth;

export const config = {
  // Matcher: which routes to protect
  // Protects everything EXCEPT API routes and static files
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
```

**How it works:**
1. User requests protected route (e.g., `/dashboard`)
2. Middleware intercepts before page renders
3. `authorized` callback checks if user is logged in
4. If not logged in, redirects to `/login`
5. If logged in, allows access

**Matcher pattern:**
- ✅ Protects: `/dashboard`, `/dashboard/invoices`
- ❌ Allows: `/api/*`, `/_next/*`, `/logo.png`

---

## Part 5: Authentication Implementation

### Main Auth File (`auth.ts`)

This file sets up NextAuth with the credentials provider.

**File:** `auth.ts`

```typescript
import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import type { User } from '@/app/lib/definitions';
import bcrypt from 'bcrypt';
import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

// Fetch user from database by email
async function getUser(email: string): Promise<User | undefined> {
  try {
    const user = await sql<User[]>`
      SELECT * FROM users WHERE email = ${email}
    `;
    return user[0];
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}

// Export auth functions
export const { auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    // Credentials provider for username/password login
    Credentials({
      async authorize(credentials) {
        // Validate email and password format
        const parsedCredentials = z
          .object({
            email: z.string().email(),
            password: z.string().min(6),
          })
          .safeParse(credentials);

        // Return null if validation fails
        if (!parsedCredentials.success) {
          return null;
        }

        // Extract validated credentials
        const { email, password } = parsedCredentials.data;
        
        // Fetch user from database
        const user = await getUser(email);
        if (!user) {
          return null; // User not found
        }

        // Compare provided password with stored hash
        const passwordsMatch = await bcrypt.compare(password, user.password);
        if (passwordsMatch) {
          return user; // Authentication successful
        }

        console.log('Invalid credentials');
        return null; // Password doesn't match
      },
    }),
  ],
});
```

### Key Security Features

✅ **Password Hashing** - Uses bcrypt to hash passwords  
✅ **Validation** - Zod validates email format and password length  
✅ **Database Query** - Fetches user from secure database  
✅ **Comparison** - Uses `bcrypt.compare()` for timing-attack safe comparison  

---

## Part 6: Login Server Action

### Authenticate Function (`app/lib/actions.ts`)

This Server Action handles login form submission.

```typescript
'use server';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    // Call NextAuth signIn with credentials from form
    await signIn('credentials', formData);
  } catch (error) {
    // Handle NextAuth errors
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    
    // Re-throw unexpected errors
    throw error;
  }
}
```

**Error handling:**
- `CredentialsSignin` - Invalid email/password
- Other errors - Generic error message
- Unexpected errors - Re-throw to client

---

## Part 7: Login Form Component

### Login Form (`app/ui/login-form.tsx`)

```typescript
'use client';

import { lusitana } from '@/app/ui/fonts';
import {
  AtSymbolIcon,
  KeyIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { ArrowRightIcon } from '@heroicons/react/20/solid';
import { Button } from '@/app/ui/button';
import { useActionState } from 'react';
import { authenticate } from '@/app/lib/actions';
import { useSearchParams } from 'next/navigation';

export default function LoginForm() {
  // Get callback URL from query params (where to redirect after login)
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  
  // useActionState manages form submission, error, and loading state
  const [errorMessage, formAction, isPending] = useActionState(
    authenticate,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-3">
      <div className="flex-1 rounded-lg bg-gray-50 px-6 pb-4 pt-8">
        <h1 className={`${lusitana.className} mb-3 text-2xl`}>
          Please log in to continue.
        </h1>
        
        {/* Email Field */}
        <div className="w-full">
          <label htmlFor="email" className="mb-3 mt-5 block text-xs font-medium text-gray-900">
            Email
          </label>
          <div className="relative">
            <input
              className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500"
              id="email"
              type="email"
              name="email"
              placeholder="Enter your email address"
              required
            />
            <AtSymbolIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
          </div>
        </div>
        
        {/* Password Field */}
        <div className="mt-4">
          <label htmlFor="password" className="mb-3 mt-5 block text-xs font-medium text-gray-900">
            Password
          </label>
          <div className="relative">
            <input
              className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500"
              id="password"
              type="password"
              name="password"
              placeholder="Enter password"
              required
              minLength={6}
            />
            <KeyIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
          </div>
        </div>
        
        {/* Hidden callback URL field */}
        <input type="hidden" name="redirectTo" value={callbackUrl} />
        
        {/* Submit Button */}
        <Button className="mt-4 w-full" aria-disabled={isPending}>
          Log in <ArrowRightIcon className="ml-auto h-5 w-5 text-gray-50" />
        </Button>
        
        {/* Error Display */}
        <div className="flex h-8 items-end space-x-1" aria-live="polite" aria-atomic="true">
          {errorMessage && (
            <>
              <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
              <p className="text-sm text-red-500">{errorMessage}</p>
            </>
          )}
        </div>
      </div>
    </form>
  );
}
```

### Features:
- **useActionState** - Manages pending state and errors
- **useSearchParams** - Gets callback URL for redirect after login
- **aria-live** - Screen readers announce errors
- **Input validation** - Email type and password minLength

---

## Part 8: Logout Functionality

### Sign Out Button (`app/ui/dashboard/sidenav.tsx`)

```typescript
import { signOut } from '@/auth';

export default function SideNav() {
  return (
    <div className="flex h-full flex-col px-3 py-4 md:px-2">
      {/* Navigation content */}
      
      {/* Sign Out Button */}
      <form
        action={async () => {
          'use server';
          await signOut({ redirectTo: '/' });
        }}
      >
        <button className="flex h-[48px] grow items-center justify-center gap-2 rounded-md bg-gray-50 p-3 text-sm font-medium hover:bg-sky-100 hover:text-blue-600 md:flex-none md:justify-start md:p-2 md:px-3">
          <PowerIcon className="w-6" />
          <div className="hidden md:block">Sign Out</div>
        </button>
      </form>
    </div>
  );
}
```

**How it works:**
- Form wraps the button (forms can execute Server Actions)
- `signOut()` clears the session
- `redirectTo: '/'` sends user to home page after logout

---

## Part 9: Login Page Setup

### Login Page (`/app/login/page.tsx`)

```typescript
import AcmeLogo from '@/app/ui/acme-logo';
import LoginForm from '@/app/ui/login-form';
import { Suspense } from 'react';

export default function LoginPage() {
  return (
    <main className="flex items-center justify-center md:h-screen">
      <div className="relative mx-auto flex w-full max-w-[400px] flex-col space-y-2.5 p-4 md:-mt-32">
        {/* Logo */}
        <div className="flex h-20 w-full items-end rounded-lg bg-blue-500 p-3 md:h-36">
          <div className="w-32 text-white md:w-36">
            <AcmeLogo />
          </div>
        </div>
        
        {/* Login Form with Suspense */}
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
```

---

## Part 10: Test Credentials

Use these credentials to test the login:

| Field | Value |
|-------|-------|
| **Email** | `user@nextmail.com` |
| **Password** | `123456` |

These are seeded in the database by the seed script from Chapter 6.

---

## Authentication Flow Diagram

```
User visits /dashboard
  ↓
Middleware (proxy.ts) intercepts
  ↓
authorized() callback checks session
  ↓
No session? → Redirect to /login
  ↓
User enters email & password
  ↓
Form submits to authenticate() Server Action
  ↓
authorize() callback in auth.ts runs:
  1. Validate email & password format (Zod)
  2. Query database for user by email
  3. Compare password with bcrypt hash
  ↓
Valid? → signIn() creates session
  ↓
User redirected to /dashboard
  ↓
Middleware sees valid session → Allow access
```

---

## Security Best Practices

✅ **Never store plain text passwords** - Use bcrypt for hashing  
✅ **Keep AUTH_SECRET secure** - Add to `.env.local`, never commit  
✅ **Use HTTPS only** - Sessions are HTTP-only cookies (requires HTTPS in production)  
✅ **Validate all input** - Use Zod to validate email and password  
✅ **Handle errors gracefully** - Don't reveal if user exists (generic error message)  
✅ **Protect routes early** - Middleware catches unauthorized access before rendering  

---

## Complete Files Reference

| File | Purpose |
|------|---------|
| `auth.config.ts` | Auth configuration & route protection |
| `auth.ts` | NextAuth setup & credentials provider |
| `proxy.ts` (or `middleware.ts`) | Route protection middleware |
| `app/lib/actions.ts` | authenticate() Server Action |
| `app/ui/login-form.tsx` | Login form component |
| `app/login/page.tsx` | Login page |
| `app/ui/dashboard/sidenav.tsx` | Sign out button |
| `.env.local` | AUTH_SECRET (not committed) |

---

## Quick Reference

### Environment Variables
```env
AUTH_SECRET=your-secret-key
POSTGRES_URL=your-database-url
```

### Key Functions
| Function | Purpose |
|----------|---------|
| `signIn('credentials', formData)` | Authenticate user |
| `signOut({ redirectTo: '/' })` | Logout and redirect |
| `auth()` | Get current session |
| `bcrypt.compare()` | Verify password hash |

### NextAuth Features
✅ Session management  
✅ CSRF protection (automatic)  
✅ Secure cookies (HTTP-only)  
✅ Multiple auth providers support  
✅ TypeScript support  

---

## Next Steps

You now understand:
- ✅ Authentication vs Authorization
- ✅ NextAuth.js setup and configuration
- ✅ Route protection with middleware
- ✅ Credentials provider for email/password login
- ✅ Password hashing with bcrypt
- ✅ Session management
- ✅ Login/logout flow
- ✅ Error handling for auth failures

Your dashboard is now **secure with user authentication**! 🚀

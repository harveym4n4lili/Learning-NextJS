# Chapter 1: Getting Started - Setup Commands & pnpm Dev

## Quick Setup Guide

### 1. Install pnpm (Global)
```bash
npm install -g pnpm
```
**What is pnpm?** A faster and more efficient package manager compared to npm or yarn.

---

### 2. Create the Next.js Dashboard Project
```bash
npx create-next-app@latest nextjs-dashboard --example "https://github.com/vercel/next-learn/tree/main/dashboard/starter-example" --use-pnpm
```
- Uses `create-next-app` CLI tool
- Automatically sets up Next.js with the course starter example
- Configures pnpm as the package manager

---

### 3. Navigate to Your Project
```bash
cd nextjs-dashboard
```

---

### 4. Install Dependencies
```bash
pnpm i
```
Installs all required packages for the project.

---

### 5. Run Development Server
```bash
pnpm dev
```
- Starts the dev server locally
- Access your app at: **http://localhost:3000**

---

## Project Structure Overview

| Folder | Purpose |
|--------|---------|
| `/app` | Main development area - routes, components, and application logic |
| `/app/lib` | Utility functions and data fetching helpers |
| `/app/ui` | Pre-styled UI components (cards, tables, forms, etc.) |
| `/public` | Static assets like images |

**Config Files:** Already pre-configured - no changes needed.

---

## Important Files to Know

### `/app/lib/placeholder-data.ts`
- Contains placeholder data (JavaScript objects)
- Simulates database tables
- Used in later chapters to seed a real database

### `/app/lib/definitions.ts`
- TypeScript type definitions
- Example: `Invoice` type ensures `amount` is a number and `status` is either 'pending' or 'paid'
- Prevents passing incorrect data to components

---

## Key Takeaways

✅ **pnpm** = Faster package manager  
✅ **TypeScript** = Type safety for components and data  
✅ **Pre-written code** = Mirrors real development workflows  
✅ **Pre-styled UI** = Focus on Next.js features, not styling  

---

## Next Steps
After setup, you're ready for Chapter 2 and beyond. The foundation is now in place!

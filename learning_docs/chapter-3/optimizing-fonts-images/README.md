# Chapter 3: Optimizing Fonts & Images

## Overview

This chapter covers how to optimize fonts and images in Next.js to improve performance and user experience.

---

## 1. Font Optimization with `next/font`

### The Problem: Cumulative Layout Shift (CLS)

**What is CLS?**
- Browser initially renders text in a **fallback/system font**
- Custom font loads and **replaces** the fallback
- This swap changes text size and spacing
- Layout shifts, affecting nearby elements
- Google uses CLS as a performance metric for website ranking

**Next.js Solution:**
- `next/font` downloads fonts at **build time**
- Fonts hosted with static assets (no extra network requests)
- No layout shift - custom fonts ready from the start

### Setup: Single Font

**Step 1: Create font configuration** - `/app/ui/fonts.ts`
```typescript
import { Inter } from 'next/font/google';

export const inter = Inter({ subsets: ['latin'] });
```

**Step 2: Apply to root layout** - `/app/layout.tsx`
```typescript
import '@/app/ui/global.css';
import { inter } from '@/app/ui/fonts';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

### Multiple Fonts with Different Weights

```typescript
import { Inter, Lusitana } from 'next/font/google';

export const inter = Inter({ subsets: ['latin'] });
export const lusitana = Lusitana({ 
  subsets: ['latin'],
  weight: ['400', '700'] // normal and bold
});
```

Then use in components:
```typescript
<h1 className={lusitana.className}>Welcome</h1>
<p className={inter.className}>Regular text</p>
```

---

## 2. Image Optimization with `<Image>` Component

### The Problem: Manual HTML Images

❌ Don't work well responsively across screen sizes  
❌ Can't optimize for different devices  
❌ Cause layout shifts while loading  
❌ Don't lazy load by default  
❌ Send unnecessarily large files to small screens  

### The Solution: Next.js `<Image>` Component

The `<Image>` component from `next/image` provides automatic optimization:

✅ **Prevents layout shift** - Must specify width & height  
✅ **Resizes images** - Sends appropriate size to each device  
✅ **Lazy loads** - Only loads as images enter viewport  
✅ **Modern formats** - Serves WebP/AVIF when supported  

### Basic Usage

```typescript
import Image from 'next/image';

export default function Page() {
  return (
    <Image
      src="/hero.png"
      width={1000}
      height={760}
      alt="Screenshot of the dashboard"
    />
  );
}
```

### Responsive Images (Desktop & Mobile)

```typescript
import Image from 'next/image';

export default function Page() {
  return (
    <div className="flex items-center justify-center p-6">
      {/* Desktop Image */}
      <Image
        src="/hero-desktop.png"
        width={1000}
        height={760}
        className="hidden md:block"
        alt="Dashboard - Desktop version"
      />
      
      {/* Mobile Image */}
      <Image
        src="/hero-mobile.png"
        width={560}
        height={620}
        className="md:hidden"
        alt="Dashboard - Mobile version"
      />
    </div>
  );
}
```

---

## Key Concepts

### Width & Height Attributes

⚠️ **Important:** Width and height are **NOT** render dimensions!

- They define the **aspect ratio** of the image
- Prevents layout shift by reserving space
- Next.js uses them to determine how to resize the image
- Must match the **source image's** aspect ratio

```typescript
<Image
  src="/image.png"
  width={1000}    // source width
  height={760}    // source height (defines aspect ratio)
  alt="..."
/>
```

### Static Assets Folder

Store all images in `/public` folder:
```
/public
  /hero-desktop.png
  /hero-mobile.png
  /logo.png
  /icons/
```

Reference in code without `/public`:
```typescript
src="/hero-desktop.png"  // ✅ Correct
src="public/hero-desktop.png"  // ❌ Wrong
```

---

## Best Practices Checklist

✅ **Fonts**
- Use `next/font` for all custom fonts
- Download at build time (no runtime requests)
- Prevents CLS issues
- Set `antialiased` class for better text rendering

✅ **Images**
- Always use `<Image>` component (never raw `<img>`)
- Specify width & height matching source dimensions
- Always include descriptive alt text (accessibility & SEO)
- Store images in `/public` folder
- Use responsive images with Tailwind (`hidden md:block`)
- Lazy loads by default (no extra configuration needed)

---

## Quick Reference

| Feature | Font | Image |
|---------|------|-------|
| **Import** | `from 'next/font/google'` | `from 'next/image'` |
| **Build Time** | ✅ Downloads fonts | ✅ Optimizes images |
| **Prevents CLS** | ✅ Yes | ✅ Yes (with width/height) |
| **Lazy Load** | N/A | ✅ By default |
| **Responsive** | Use CSS classes | Show different images per device |

---

## Common Mistakes to Avoid

❌ Using `<img>` instead of `<Image>`  
❌ Forgetting width & height on `<Image>`  
❌ Storing images outside `/public`  
❌ Not including alt text  
❌ Using custom fonts without `next/font`  

---

## Next Steps

You've learned how to optimize both fonts and images. This directly impacts:
- **Core Web Vitals** (Google ranking factor)
- **User experience** (faster pages)
- **SEO** (better performance = better ranking)

Ready for the next chapter!

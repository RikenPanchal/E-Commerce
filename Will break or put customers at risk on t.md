Will break or put customers at risk on the live site
1. Done : Password reset doesn't email the customer. It only writes the reset link to the server log, so customers can't reset their password, and anyone who can read the logs can take over accounts. (forgot-password/route.ts)
2. Done : Back-in-stock emails are a placeholder. They only log a message but mark subscribers "notified", so restock alerts are used up without anyone being told. (backInStock.ts)
3. Admin image uploads won't work on Vercel. Files are saved to the server's disk, which Vercel doesn't keep, and your 16 existing uploads aren't included in deploys. They need cloud storage such as Vercel Blob or Cloudinary.
4. Demo data and the demo admin (admin@demo.shop / Admin@123) are still in the database. Remove them before launch with npm run seed -- --reset.
5. NEXT_PUBLIC_SITE_URL isn't set, so SEO links, the sitemap and social-media share previews point to localhost:3000.

Security
6. Done : No rate limiting on sign-in, sign-up or forgot-password, so there's no protection against password guessing or reset-email spam.

Legal and business requirements for India
7. Placeholder contact emails (support@e-commerce.example, privacy@e-commerce.example), and there's no Contact Us page.
8. Consumer Protection (E-Commerce) Rules, 2020 require your legal business name, address, contact details and a named grievance officer on the site.
9. Done : "All sales are final – no returns" policy: consumer rules still require refunds for defective, damaged or wrong items. Have the wording reviewed.
10. GST: there are no invoices with GSTIN or a tax breakdown, which you'll need if you're registered.

Missing features and polish

11. Done : Only the order confirmation email is sent. There are no shipped (with tracking), delivered or cancelled/refund emails.
12. Done : No custom error page; a crash shows Next.js's default error screen.
13. No automated tests, analytics or error monitoring (e.g. Vercel Analytics, Sentry).
14. Small fixes:
    1. Done : The order page says "Order confirmed" even when payment failed.
    2. "Dress 1" has no photo but shows in the homepage hero.
    3. Done : The Color filter list is cluttered with combined names like "Black & Red".
    4. Also still open: the 3 Razorpay bugs from before, plus committing and pushing the Vercel cron fix.

Suggested order:

Points 1–2: quick, because email already works.
The Razorpay bugs.
Points 3–6.
Points 7–10: I can build the Contact page, but you'll need to send me the business details.
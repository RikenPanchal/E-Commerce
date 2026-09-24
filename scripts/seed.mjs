#!/usr/bin/env node
// Seeds realistic demo data (users, products, collections, coupons, reviews,
// orders, back-in-stock alerts) into the database in MONGODB_URI.
// Usage: npm run seed            (insert/refresh demo data)
//        npm run seed -- --reset (remove only the demo data this script created)
//
// Safe to re-run: products/collections/coupons/users are upserted by their
// unique key, and demo orders/reviews/alerts are replaced. Anything that
// wasn't created by this script (real accounts, your own products) is left alone.
import { existsSync, readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import { CATALOG, TYPES, UNSPLASH } from "./seed-catalog.mjs";

function loadEnvLocal() {
  const envPath = fileURLToPath(new URL("../.env.local", import.meta.url));
  if (!existsSync(envPath)) {
    return;
  }

  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) {
      continue;
    }
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

// Deterministic PRNG so re-running produces the same data.
let seed = 20260924;
function rand() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const int = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const daysAgo = (n) => new Date(Date.now() - n * 86400000 - int(0, 86399) * 1000);

const DEMO_EMAIL_DOMAIN = "@demo.shop";
const DEMO_SKU_PREFIX = "DEMO-";

const UNSIZED_TYPES = new Set(["saree", "bag", "tote", "clutch", "earrings", "necklace", "bracelet", "sunglasses", "belt", "scarf"]);
const SIZE_RUNS = {
  default: ["XS", "S", "M", "L", "XL"],
  extended: ["S", "M", "L", "XL", "XXL"],
  lehenga: ["S", "M", "L", "XL"],
};

function buildDescription(blurb, type, material, category) {
  const t = TYPES[type];
  return [
    blurb,
    `Highlights\n${t.highlights.map((h) => `• ${h}`).join("\n")}`,
    `${category === "Accessories" ? "Size" : "Fit & Size"}\n${t.fit}`,
    `${category === "Accessories" ? "Material & Care" : "Fabric & Care"}\n${material}. ${t.care}`,
  ].join("\n\n");
}

function buildProducts() {
  const entries = Object.entries(CATALOG).flatMap(([category, list]) => list.map((row) => [category, row]));
  return entries.map(([category, row], i) => {
    const [slug, name, type, photos, colorList, material, brand, price, compareAtPrice, blurb] = row;
    const sku = `${DEMO_SKU_PREFIX}${slug.toUpperCase().replace(/-/g, "").slice(0, 10)}-${String(i + 1).padStart(3, "0")}`;
    // One color option that matches what's actually in the photos (e.g.
    // "Black & Red" for a two-tone print), so the swatch never contradicts the image.
    const colors = [{ name: colorList.map((c) => c.name).join(" & "), hex: colorList[0].hex }];

    let sizes = [];
    let variants = [];
    let stock;
    if (!UNSIZED_TYPES.has(type)) {
      sizes = type === "lehenga" ? SIZE_RUNS.lehenga : i % 3 === 0 ? SIZE_RUNS.extended : SIZE_RUNS.default;
      for (const size of sizes) {
        // Make a few sizes sold out so back-in-stock alerts can be tested.
        const soldOut = rand() < 0.12;
        variants.push({
          _id: new ObjectId(),
          size,
          // Must match the product's color option exactly - the storefront
          // resolves a variant by (size, color), so a color-less variant on
          // a product that has a color can never be selected.
          color: colors[0].name,
          sku: `${sku}-${size}`,
          price: size === "XXL" ? price + 100 : price,
          ...(compareAtPrice ? { compareAtPrice: size === "XXL" ? compareAtPrice + 100 : compareAtPrice } : {}),
          stock: soldOut ? 0 : int(2, 25),
          isActive: true,
        });
      }
      stock = variants.reduce((sum, v) => sum + v.stock, 0);
    } else {
      stock = i % 11 === 0 ? 0 : int(3, 60);
    }

    // A couple of fully sold-out products for testing the out-of-stock UI.
    if (slug === "tangerine-long-sleeve-dress" || slug === "green-gold-festive-saree") {
      variants = variants.map((v) => ({ ...v, stock: 0 }));
      stock = 0;
    }

    const colorWords = colorList.map((c) => c.name.toLowerCase());
    const createdAt = daysAgo(int(1, 120));
    return {
      name,
      slug,
      description: buildDescription(blurb, type, material, category),
      category,
      price,
      ...(compareAtPrice ? { compareAtPrice } : {}),
      sku,
      stock,
      sizes,
      colors,
      variants,
      complementaryProductIds: [],
      material,
      brand,
      tags: [...new Set([type === "kurtaSet" ? "kurta set" : type, ...colorWords, category.toLowerCase()])],
      isFeatured: i % 5 === 0,
      media: photos.map((id, n) => ({
        _id: new ObjectId(),
        type: "image",
        url: UNSPLASH(id),
        alt: photos.length > 1 ? `${name} - view ${n + 1}` : name,
      })),
      seo: {
        description: blurb.length > 160 ? `${blurb.slice(0, 157).replace(/\s+\S*$/, "")}...` : blurb,
        keywords: [name.toLowerCase(), `${colorWords[0]} ${type === "kurtaSet" ? "kurta set" : type}`, category.toLowerCase(), "women fashion", "buy online india"],
        metaRobots: "index,follow",
        imageAlt: `${name} by ${brand}`,
      },
      isDeleted: false,
      deletedAt: null,
      createdAt,
      updatedAt: createdAt,
      __v: 0,
    };
  });
}

const CUSTOMERS = [
  ["Priya Sharma", "Mumbai", "Maharashtra", "400050"],
  ["Ananya Iyer", "Bengaluru", "Karnataka", "560038"],
  ["Sneha Patel", "Ahmedabad", "Gujarat", "380015"],
  ["Kavya Reddy", "Hyderabad", "Telangana", "500034"],
  ["Meera Nair", "Kochi", "Kerala", "682020"],
  ["Riya Kapoor", "New Delhi", "Delhi", "110024"],
  ["Ishita Banerjee", "Kolkata", "West Bengal", "700019"],
  ["Pooja Joshi", "Pune", "Maharashtra", "411004"],
];
const STREETS = ["MG Road", "Linking Road", "Park Street", "Residency Road", "SG Highway", "Banjara Hills Rd 12"];

async function buildUsers() {
  const [adminHash, userHash] = await Promise.all([
    bcrypt.hash("Admin@123", 10),
    bcrypt.hash("Test@1234", 10),
  ]);
  const admin = {
    name: "Demo Admin",
    email: `admin${DEMO_EMAIL_DOMAIN}`,
    password: adminHash,
    role: "admin",
    addresses: [],
  };
  const customers = CUSTOMERS.map(([name, city, state, postalCode], i) => {
    const phone = `9${String(800000000 + i * 1234567).slice(0, 9)}`;
    const addresses = [
      {
        _id: new ObjectId(),
        label: "Home",
        fullName: name,
        phone,
        line1: `${int(1, 250)}, ${pick(STREETS)}`,
        line2: `Apartment ${int(1, 20)}0${int(1, 9)}`,
        city,
        state,
        postalCode,
        isDefault: true,
      },
    ];
    if (i % 3 === 0) {
      addresses.push({
        _id: new ObjectId(),
        label: "Office",
        fullName: name,
        phone,
        line1: `${int(1, 99)}, Tech Park, ${pick(STREETS)}`,
        city,
        state,
        postalCode,
        isDefault: false,
      });
    }
    return {
      name,
      email: `${name.split(" ")[0].toLowerCase()}${DEMO_EMAIL_DOMAIN}`,
      password: userHash,
      role: "user",
      addresses,
    };
  });
  return [admin, ...customers];
}

const COUPONS = [
  { code: "WELCOME10", discountType: "percentage", value: 10, isActive: true, expiresAt: daysAgo(-90) },
  { code: "FLAT200", discountType: "fixed", value: 200, minOrderAmount: 1499, isActive: true, expiresAt: daysAgo(-60) },
  { code: "ETHNIC15", discountType: "percentage", value: 15, minOrderAmount: 1999, applicableCategories: ["Ethnic Wear"], isActive: true, expiresAt: daysAgo(-45) },
  { code: "ACCESS25", discountType: "percentage", value: 25, applicableCategories: ["Accessories"], maxUses: 100, isActive: true, expiresAt: null },
  { code: "BIGSALE500", discountType: "fixed", value: 500, minOrderAmount: 3999, maxUses: 50, isActive: true, expiresAt: daysAgo(-30) },
  { code: "LIMITED5", discountType: "percentage", value: 5, maxUses: 3, usedCount: 3, isActive: true, expiresAt: null },
  { code: "EXPIRED20", discountType: "percentage", value: 20, isActive: true, expiresAt: daysAgo(10) },
  { code: "DISABLED30", discountType: "percentage", value: 30, isActive: false, expiresAt: null },
];

const REVIEW_TEXT = {
  apparel: {
    5: ["Absolutely love it! The fabric quality is amazing.", "Perfect fit and looks exactly like the pictures.", "Got so many compliments. Worth every rupee!", "Beautiful color and the stitching is really neat. Will order again."],
    4: ["Really nice, just slightly longer than expected.", "Good quality for the price. Color is a shade darker than the photo.", "Comfortable and stylish, happy with the purchase."],
    3: ["Decent, but the material is thinner than I hoped.", "Okay product. Sizing runs a little small, order one size up."],
    2: ["Color faded a bit after the first wash."],
    1: ["Fit was completely off for me, had to return it."],
  },
  "Ethnic Wear": {
    5: ["Wore this to my cousin's wedding and everyone asked where I got it!", "The work is so detailed, looks far more expensive than it is.", "Gorgeous color and the fabric feels rich. Perfect for Diwali."],
    4: ["Beautiful piece, the dupatta/pallu is slightly lighter than expected.", "Lovely embroidery. Needed a small alteration but overall very happy."],
    3: ["Nice design but the fabric is a little stiff.", "Looks good, though the color is a bit brighter in person."],
    2: ["Some threads were loose near the border."],
    1: ["Not what I expected from the photos, returned it."],
  },
  Accessories: {
    5: ["Exactly as pictured and feels premium. Love it!", "Bought it as a gift and she loved it. Beautiful packaging too.", "Great quality, I use it every day."],
    4: ["Very pretty, a little smaller than I imagined.", "Good quality for the price, happy with it."],
    3: ["Looks nice but the finish could be better.", "Decent, but not as sturdy as I hoped."],
    2: ["The finish started wearing off after a few weeks."],
    1: ["Arrived with a scratch, had to return it."],
  },
};

async function main() {
  loadEnvLocal();
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Missing MONGODB_URI (checked the environment and .env.local).");
    process.exitCode = 1;
    return;
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const users = db.collection("users");
    const products = db.collection("products");
    const collections = db.collection("collections");
    const coupons = db.collection("coupons");
    const reviews = db.collection("reviews");
    const orders = db.collection("orders");
    const alerts = db.collection("backinstocksubscriptions");
    console.log(`Connected to database "${db.databaseName}".`);

    // --- Clear previous demo orders/reviews/alerts (tied to demo users) ---
    const oldDemoUsers = await users.find({ email: { $regex: `${DEMO_EMAIL_DOMAIN.replace(".", "\\.")}$` } }).project({ _id: 1 }).toArray();
    const oldDemoUserIds = oldDemoUsers.map((u) => u._id);
    const demoProductFilter = { sku: { $regex: `^${DEMO_SKU_PREFIX}` } };
    const oldDemoProductIds = (await products.find(demoProductFilter).project({ _id: 1 }).toArray()).map((p) => p._id);
    await orders.deleteMany({ user: { $in: oldDemoUserIds } });
    await reviews.deleteMany({ $or: [{ user: { $in: oldDemoUserIds } }, { product: { $in: oldDemoProductIds } }] });
    await alerts.deleteMany({ $or: [{ email: { $regex: `${DEMO_EMAIL_DOMAIN.replace(".", "\\.")}$` } }, { product: { $in: oldDemoProductIds } }] });

    if (process.argv.includes("--reset")) {
      await users.deleteMany({ _id: { $in: oldDemoUserIds } });
      await products.deleteMany(demoProductFilter);
      await collections.deleteMany({ slug: { $in: ["summer-edit", "festive-collection", "workwear-essentials", "party-ready", "monsoon-archive"] } });
      await coupons.deleteMany({ code: { $in: COUPONS.map((c) => c.code) } });
      console.log("Removed all demo data.");
      return;
    }

    // --- Users ---
    const userDocs = await buildUsers();
    for (const u of userDocs) {
      const now = daysAgo(int(30, 200));
      await users.updateOne(
        { email: u.email },
        { $set: { ...u, updatedAt: now }, $setOnInsert: { createdAt: now, __v: 0 } },
        { upsert: true }
      );
    }
    const demoUsers = await users.find({ email: { $in: userDocs.map((u) => u.email) } }).toArray();
    const customers = demoUsers.filter((u) => u.role === "user");
    console.log(`Users: ${demoUsers.length} (1 admin, ${customers.length} customers)`);

    // --- Products ---
    const existingSlugs = new Set(
      (await products.find({ sku: { $not: { $regex: `^${DEMO_SKU_PREFIX}` } } }).project({ slug: 1 }).toArray()).map((p) => p.slug)
    );
    // Never overwrite a product that you created yourself with the same slug.
    const productDocs = buildProducts().filter((p) => !existingSlugs.has(p.slug));
    // Drop demo products from older runs that are no longer in the catalog.
    await products.deleteMany({ ...demoProductFilter, slug: { $nin: productDocs.map((p) => p.slug) } });
    for (const p of productDocs) {
      await products.replaceOne({ slug: p.slug }, p, { upsert: true });
    }
    const demoProducts = await products.find(demoProductFilter).toArray();
    const bySlug = Object.fromEntries(demoProducts.map((p) => [p.slug, p]));
    const byCategory = (cat) => demoProducts.filter((p) => p.category === cat);

    // "Complete the Look" picks: dresses -> accessories, ethnic -> jewellery.
    const accessories = byCategory("Accessories");
    for (const [i, p] of [...byCategory("Dresses"), ...byCategory("Ethnic Wear")].entries()) {
      if (i % 2 !== 0) continue;
      const picks = [accessories[i % accessories.length], accessories[(i + 3) % accessories.length], accessories[(i + 7) % accessories.length]];
      await products.updateOne({ _id: p._id }, { $set: { complementaryProductIds: [...new Set(picks.map((a) => a._id.toString()))].map((id) => new ObjectId(id)) } });
    }

    // One soft-deleted product, to verify it's hidden from the storefront.
    const deletedSlug = "mustard-yellow-scarf";
    if (bySlug[deletedSlug]) {
      await products.updateOne({ slug: deletedSlug }, { $set: { isDeleted: true, deletedAt: daysAgo(3) } });
    }
    console.log(`Products: ${demoProducts.length} demo products (${demoProducts.filter((p) => p.stock === 0).length} out of stock, 1 soft-deleted)`);

    // --- Collections ---
    const collectionDefs = [
      { slug: "summer-edit", name: "Summer Edit", description: "Light, breezy sundresses, easy tops and sunny-day accessories made for holidays, brunches and long summer afternoons.", slugs: ["riviera-seaside-maxi-dress", "rose-garden-floral-dress", "pastel-blossom-sundress", "lemon-sleeveless-sundress", "blue-white-striped-sundress", "white-lace-beach-dress", "white-cotton-crop-top", "floral-cropped-top", "retro-round-gold-sunglasses", "classic-canvas-tote", "floral-canvas-handbag"], isActive: true },
      { slug: "festive-collection", name: "Festive Collection", description: "Silk sarees, embroidered lehengas and statement jewellery for weddings, Diwali and every celebration in between.", slugs: ["royal-purple-banarasi-silk-saree", "red-gold-bridal-silk-saree", "crimson-bridal-lehenga", "sapphire-red-lehenga-choli", "emerald-embroidered-lehenga", "blush-pink-cape-lehenga-set", "red-kurta-floral-dupatta-set", "pearl-white-quilted-clutch", "crescent-moon-pendant-necklace-set", "red-white-enamel-earrings"], isActive: true },
      { slug: "workwear-essentials", name: "Workwear Essentials", description: "Crisp shirts, polished blouses and structured bags - the staples for a sharp week at the office.", slugs: ["crisp-white-button-up-shirt", "white-linen-relaxed-shirt", "blue-striped-oxford-shirt", "ruby-satin-blouse", "classic-little-black-dress", "noir-leather-shoulder-bag", "grey-satchel-gold-buckle", "classic-black-leather-belt"], isActive: true },
      { slug: "party-ready", name: "Party Ready", description: "Sequins, shimmer and statement gowns for nights you'll remember.", slugs: ["champagne-sparkle-mini-dress", "amethyst-shimmer-slit-gown", "onyx-shimmer-evening-gown", "starlight-sequin-evening-dress", "black-gold-cocktail-dress", "red-ruched-satin-top", "white-beaded-clutch", "sapphire-drop-earrings"], isActive: true },
      { slug: "monsoon-archive", name: "Monsoon Archive", description: "Last season's picks (inactive - should be hidden from the storefront).", slugs: ["navy-paisley-kurti", "chambray-button-down-shirt"], isActive: false },
    ];
    for (const c of collectionDefs) {
      const productIds = c.slugs.map((s) => bySlug[s]?._id).filter(Boolean);
      // Wide banner crop of the first product's photo.
      const cover = bySlug[c.slugs[0]]?.media?.[0]?.url?.replace("w=900&h=1200", "w=1600&h=900");
      const now = daysAgo(int(5, 60));
      await collections.updateOne(
        { slug: c.slug },
        {
          $set: {
            name: c.name,
            description: c.description,
            productIds,
            isActive: c.isActive,
            ...(cover ? { image: { url: cover, alt: c.name } } : {}),
            seo: { metaRobots: "index,follow" },
            updatedAt: now,
          },
          $setOnInsert: { createdAt: now, __v: 0 },
        },
        { upsert: true }
      );
    }
    console.log(`Collections: ${collectionDefs.length} (1 inactive)`);

    // --- Coupons ---
    for (const c of COUPONS) {
      const now = daysAgo(int(5, 40));
      await coupons.updateOne(
        { code: c.code },
        { $set: { minOrderAmount: undefined, usedCount: 0, ...c, updatedAt: now }, $setOnInsert: { createdAt: now, __v: 0 } },
        { upsert: true }
      );
    }
    await coupons.updateMany({ code: { $in: COUPONS.map((c) => c.code) }, minOrderAmount: null }, { $unset: { minOrderAmount: "" } });
    console.log(`Coupons: ${COUPONS.length} (1 expired, 1 disabled, 1 fully used)`);

    // --- Reviews ---
    const reviewDocs = [];
    for (const p of demoProducts) {
      // Featured products get more reviews (up to all 8 demo customers), so
      // the product page's review pagination has something to page through.
      const count = p.isFeatured ? int(5, 8) : int(0, 5);
      const reviewers = [...customers].sort(() => rand() - 0.5).slice(0, count);
      for (const u of reviewers) {
        const r = rand();
        const rating = r < 0.5 ? 5 : r < 0.8 ? 4 : r < 0.92 ? 3 : r < 0.97 ? 2 : 1;
        const at = daysAgo(int(1, 90));
        reviewDocs.push({ product: p._id, user: u._id, rating, comment: pick((REVIEW_TEXT[p.category] ?? REVIEW_TEXT.apparel)[rating]), createdAt: at, updatedAt: at, __v: 0 });
      }
    }
    if (reviewDocs.length) await reviews.insertMany(reviewDocs);
    console.log(`Reviews: ${reviewDocs.length}`);

    // --- Orders ---
    // [status, paymentStatus, count]
    const orderPlan = [
      ["delivered", "paid", 10],
      ["shipped", "paid", 5],
      ["processing", "paid", 5],
      ["pending", "paid", 3],
      ["pending", "pending", 3],
      ["pending", "failed", 3],
      ["cancelled", "paid", 2],
      ["cancelled", "failed", 1],
    ];
    const carriers = ["Delhivery", "Blue Dart", "DTDC", "Ecom Express"];
    const liveProducts = demoProducts.filter((p) => p.slug !== deletedSlug);
    const orderDocs = [];
    for (const [status, paymentStatus, count] of orderPlan) {
      for (let n = 0; n < count; n++) {
        const user = pick(customers);
        const address = user.addresses.find((a) => a.isDefault) ?? user.addresses[0];
        const items = [];
        const lineCount = int(1, 3);
        const used = new Set();
        while (items.length < lineCount) {
          const p = pick(liveProducts);
          if (used.has(p.slug)) continue;
          used.add(p.slug);
          const variant = p.variants.length ? pick(p.variants) : null;
          items.push({
            product: p._id,
            ...(variant ? { variantId: variant._id } : {}),
            name: p.name,
            price: variant?.price ?? p.price,
            image: p.media?.[0]?.url,
            ...(variant?.size ? { size: variant.size } : {}),
            color: variant?.color ?? p.colors?.[0]?.name,
            sku: variant?.sku ?? p.sku,
            quantity: int(1, 2),
          });
        }
        const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);
        let couponCode;
        let discountAmount = 0;
        if (rand() < 0.3) {
          if (subtotal >= 1499 && rand() < 0.5) {
            couponCode = "FLAT200";
            discountAmount = 200;
          } else {
            couponCode = "WELCOME10";
            discountAmount = Math.round(subtotal * 0.1);
          }
        }
        const createdAt =
          status === "pending" && paymentStatus === "pending" ? new Date(Date.now() - int(5, 50) * 60000) : daysAgo(
            status === "delivered" ? int(10, 90) : status === "shipped" ? int(2, 6) : status === "processing" ? int(1, 3) : int(0, 20)
          );
        const paid = paymentStatus === "paid";
        const paidAt = paid ? new Date(createdAt.getTime() + 60000) : null;
        const shippedAt = ["shipped", "delivered"].includes(status) ? new Date(createdAt.getTime() + int(1, 2) * 86400000) : null;
        const deliveredAt = status === "delivered" ? new Date(shippedAt.getTime() + int(2, 5) * 86400000) : null;
        const cancelledAt = status === "cancelled" ? new Date(createdAt.getTime() + int(1, 24) * 3600000) : null;
        orderDocs.push({
          user: user._id,
          items,
          shippingAddress: {
            fullName: address.fullName,
            phone: address.phone,
            line1: address.line1,
            ...(address.line2 ? { line2: address.line2 } : {}),
            city: address.city,
            state: address.state,
            postalCode: address.postalCode,
          },
          subtotal,
          ...(couponCode ? { couponCode } : {}),
          discountAmount,
          shippingCost: 0,
          total: subtotal - discountAmount,
          status,
          paymentProvider: "razorpay",
          paymentStatus,
          razorpayOrderId: `order_demo${randomBytes(6).toString("hex")}`,
          ...(paid ? { razorpayPaymentId: `pay_demo${randomBytes(6).toString("hex")}` } : {}),
          paidAt,
          ...(shippedAt ? { trackingNumber: `TRK${int(100000000, 999999999)}IN`, carrier: pick(carriers) } : {}),
          shippedAt,
          deliveredAt,
          cancelledAt,
          createdAt,
          updatedAt: deliveredAt ?? shippedAt ?? cancelledAt ?? paidAt ?? createdAt,
          __v: 0,
        });
      }
    }
    await orders.insertMany(orderDocs);
    console.log(`Orders: ${orderDocs.length} across every status/payment combination`);

    // --- Back-in-stock alerts (on sold-out variants/products) ---
    const alertDocs = [];
    for (const p of liveProducts) {
      const soldOut = p.variants.length ? p.variants.filter((v) => v.stock === 0) : p.stock === 0 ? [null] : [];
      for (const v of soldOut.slice(0, 1)) {
        const u = pick(customers);
        const at = daysAgo(int(1, 20));
        alertDocs.push({ product: p._id, variantId: v?._id ?? null, email: u.email, user: u._id, status: "active", unsubscribeToken: randomBytes(24).toString("hex"), notifiedAt: null, createdAt: at, updatedAt: at, __v: 0 });
      }
      if (alertDocs.length >= 12) break;
    }
    if (alertDocs.length) {
      alertDocs.push({ ...alertDocs[0], email: "guest.shopper@example.com", user: null, unsubscribeToken: randomBytes(24).toString("hex") });
      if (alertDocs[1]) alertDocs[1] = { ...alertDocs[1], status: "notified", notifiedAt: daysAgo(1) };
      await alerts.insertMany(alertDocs);
    }
    console.log(`Back-in-stock alerts: ${alertDocs.length}`);

    console.log("\nDone. Sign in with:");
    console.log(`  Admin:    admin${DEMO_EMAIL_DOMAIN} / Admin@123`);
    console.log(`  Customer: priya${DEMO_EMAIL_DOMAIN} / Test@1234  (all customers share this password)`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

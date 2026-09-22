# Design system

Premium fashion-editorial theme (v3): elegant, confident, minimal - closer
to a high-end fashion house's own site than an ecommerce template. This
folder holds the reusable pieces. Page-level compositions/layouts are
redesigned separately, page by page - Header, Footer, the homepage, and
the Shop page have all had a dedicated pass already, and pick up this v3
retune automatically without being edited again here; Category, Product
Detail, Cart, and Checkout have not been redesigned yet.

## Tokens (`src/app/globals.css`)

| Token | Value | Utility |
|---|---|---|
| Background | `#FAF9F7` (warm white) | `bg-background` |
| Surface | `#FFFFFF` (pure white) | `bg-surface` |
| Soft neutral | `#F2F0ED` (light gray-beige) | `bg-soft` |
| Primary text | `#151515` (near-black) | `text-foreground` |
| Secondary text | `#6F6B67` (muted warm gray) | `text-muted-foreground` |
| Border | `#E5E1DD` | `border-surface-border` |
| Accent (brand) | `#A87582` | `bg-rose-500` / `text-rose-600` |
| Accent (button-safe, on white text) | `#8F636D` | `bg-rose-600` |

`soft` is the third neutral - not another white, not the border color. Use
it where a section, badge, or disabled control needs to read as visually
distinct from a plain `bg-background`/`bg-surface` area without reaching
for color (an alternating section wash, a wash behind a photo, a neutral
`Badge`, a disabled `Input`).

- **Radius**: `rounded-lg/xl/2xl/3xl` now cap out at 8px (4/6/8/8px) - small
  and square, not soft. `rounded-full` is untouched (always a perfect
  circle) and is still fine for a genuinely circular icon button/avatar -
  just not for turning a whole CTA into a pill.
- **Shadows**: `shadow-sm/md` are now almost imperceptible (a hairline of
  depth, not a "floating card" look). `shadow-lg/xl` stay reserved for
  things that actually float above the page - `Modal`/`Drawer`, an open
  dropdown - and are the only steps still meant to read as a clear shadow.
- **Transitions**: unlabelled `transition-*` utilities default to 200ms
  with a gentle ease-in-out curve.
- **Fonts**: `font-serif` = Playfair Display (editorial headings, with a
  slightly tightened default letter-spacing baked in), `font-sans` = Geist
  Sans (body/UI, unchanged).

**Rule of thumb:** rose is a rare accent (roughly 1-5% of any given view),
not the primary color - reach for `primary` (ink) buttons by default, and
`accent` (rose) for at most one highlighted action per view. If a screen
is reading as "a pink website", that's a bug, not a style choice.

## Components

- `Button` / `buttonVariants` - primary (ink), accent (rose), outline
  (all three: small radius, tracked-out uppercase label), ghost, link
  (both: plain, sentence case, for quieter secondary actions). Sizes
  sm/md/lg.
- `Input`, `Textarea`, `Select`, `Label` - shared field styling.
- `Badge` - status/category tags. Rectangular, not a pill.
- `SectionHeading` - eyebrow + serif title + description + optional
  trailing action. `size="display"` is the dramatically large treatment
  (a huge, tight-leading headline, e.g. "NEW" stacked over "ARRIVALS")
  for a page/section that wants that bigger editorial moment; the default
  size is the original, more conventional scale used everywhere today.
- `Skeleton`, `SkeletonText`, `ProductCardSkeleton` - loading placeholders.
- `ProductCardFrame`, `ProductCardImageFrame`, `ProductCardBody` -
  composable, borderless/shadowless image-first card pieces (matching the
  real `ProductCard`'s own shape) for other image-led cards, e.g. an
  editorial or category tile.
- `Modal`, `Drawer` - portal-rendered overlay foundations (Escape + backdrop
  to close, scroll-locked). `Drawer` supports `side="left" | "right" |
  "bottom"` (the last is the mobile filter-sheet shape).
- `icon.ts` - shared icon size classes and the icon stroke-width
  convention (24x24 viewBox, `currentColor`, 1.5 stroke). Every
  customer-facing interface icon (`home/icons.tsx` and the small icons in
  `shop/`, `cart/`, `auth/`) is now actually on this one weight - it used
  to drift between 1.4 and 2 depending on the file. The exception is
  `shop/categoryArt.tsx`'s large placeholder illustrations, a deliberately
  different class of asset (big line art, not a small UI icon), and the
  admin panel, which isn't part of this customer-facing system.

## The real `ProductCard` (`src/components/shop/ProductCard.tsx`)

Not a "card" in the boxed-UI sense - no border, no shadow, no rounded
container around the whole thing. Just a large, sharp-cornered photo
(`rounded-none`) with plain text underneath: category, name, rating,
price/discount, color swatches, and a plain underlined-on-hover text
action ("Select options" / "Add to bag" / "Out of stock") rather than a
bordered button. A small quick-add circle (translucent white, no
border/shadow, inverts to solid ink on hover) sits over the photo. This is
the one shared component actually used across the homepage and Shop page
today - restyle it here, not per page.

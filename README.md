# CareerPilot Digital

CareerPilot Digital is a static digital-product marketplace with **345 products across 13 collections**.

## Product mix
- Existing business, productivity, finance, marketing, freelance, career, personal and operations resources.
- **15 substantial planner bundles**, ranging from 48 to 76 pages, including life planning, wedding planning, ADHD-friendly focus, business, finance, study, creator, home, travel, wellness, freelance, meal planning, teacher, real estate and Etsy shop systems.
- **20 original digital-art and creative collections**, including clipart, SVG graphics, sticker assets, seamless patterns, printable wall art, social layouts, invitation stationery, sublimation designs, coloring pages and icon packs.

## Content depth and product formats
- Standard planners, workbooks, guides, playbooks, trackers, journals, kits and templates now have product-specific page plans and varied page counts; they are no longer forced into a six-page shell.
- Planner bundles have 48–76 pages and section-specific layouts.
- Digital-art downloads are generated as ZIP bundles with individual editable SVG files and transparent PNG exports where supported.
- Coloring-book and printable event kits are multi-page PDFs.
- Each product has a visual preview that shows an actual interior worksheet page or a contact sheet of artwork included in the download.
- PDF previews open in the browser before download; artwork collections show the contact sheet, formats and included contents before ZIP download.
- The companion notes panel remains available for PDF resources.

## Marketplace research and originality
Creative Fabrica's public marketplace and category guide were used to understand the breadth of digital-product formats: bundles, illustrations, clipart, SVG, patterns, backgrounds, icons, graphic templates, coloring pages, KDP interiors and craft assets. Etsy and Creative Fabrica are research references only. CareerPilot's product text, planner structures and vector artwork are original; no seller files, preview images, trademarks or proprietary layouts are copied.

## Technical structure
- `index.html` - storefront and collection discovery.
- `store.css` / `store.js` - responsive UI, product filtering, PDF generation, SVG/PNG asset generation, ZIP creation and browser previews.
- `products/catalog.json` - structured metadata and product-specific content for all 345 products.
- `previews/` - 345 actual product-page or art-sheet previews.
- `downloads/` - retained legacy source PDFs; the live product experience now generates expanded editions from the updated product records.

## Deployment
Static Vercel deployment from the repository root. No build command is required. New PDF editions and artwork ZIPs are assembled in the visitor's browser at download time.

## Commercial status
All resources are currently free launch downloads. Paid checkout and protected file delivery are not configured. Add secure checkout and delivery controls before selling paid downloads.

## Content note
Educational and organisational resources are not a substitute for qualified legal, tax, investment, medical or other specialist advice.


## Wedding invitation collection
- Adds 10 original editable invitation designs in the Wedding Invitations collection.
- Styles: black-tie editorial, blush Art Deco, emerald botanical, lavender floral, terracotta destination, celestial midnight, burgundy heirloom, onyx and champagne, sage garden, and peacock emerald.
- Four are single-page invitations; six are two-page suites with matching details and RSVP pages.
- Browser editor supports editing the couple names, wedding date, time, venue, address, city, RSVP deadline, email, phone, dress code and wedding website.
- Downloads contain editable SVG vector pages and high-resolution PNG exports in a ZIP kit.

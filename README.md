# CareerPilot Digital

CareerPilot Digital is a static digital-resource storefront featuring **310 original downloads** across nine collections.

- 10 original CareerPilot planners retained from the earlier site.
- 200 individually titled six-page PDF products already in the library.
- 100 additional Etsy-market-inspired planners, trackers, journals, workbooks, event kits and creator resources, written and designed as original CareerPilot editions.

## Market research and originality

The new collection was informed by broad Etsy digital-download categories such as undated digital planners, wedding and event binders, travel organisers, meal planners, budgeting trackers, savings tools, creator resources and seller templates. CareerPilot does not copy Etsy seller PDFs, listing images, branding or proprietary layouts.

## Product experience

- Visitors can preview each product in the browser before downloading.
- The 100 new editions have individual interior-page SVG previews showing actual worksheet prompts from the product.
- Each new edition contains six pages: cover, start-here guide, product-specific method, guided worksheet, reusable tracker and 30-day action plan.
- New PDF files are generated in the browser from the same product-specific content used by the preview and can be downloaded as PDFs.
- Existing PDF products continue to use their original downloadable files.
- The reader includes a separate companion notes panel. Notes are saved locally in the visitor's browser and can be exported as a text file.

## Structure

- `index.html` - storefront and product discovery experience.
- `store.css` / `store.js` - responsive design, search, filters, online reader, PDF generation, local notes and downloads.
- `products/catalog.json` - product metadata and structured content for all 310 products.
- `previews/etsy-inspired/` - 100 product-specific interior worksheet previews.
- `downloads/planners/` - 10 original planner PDFs.
- `downloads/products/` - 200 existing six-page PDFs.

## Deployment

This is a static site. Deploy the repository root on Vercel with no build command or serverless functions required. The new PDF editions are generated client-side when a visitor opens or downloads them.

## Commercial status

All products are marked as free launch downloads in this release. No payment provider or paid checkout is configured. Add secure checkout and protected file delivery before changing products to paid downloads.

## Content note

Resources are educational planning tools. They do not replace legal, tax, investment, medical or other specialist advice.

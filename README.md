# CareerPilot Digital

CareerPilot Digital is a static digital-download storefront featuring **210 PDF resources**:

- 10 original CareerPilot planners retained from the previous site.
- 200 new, individually titled six-page digital products across nine collections.

## Collections

Business & Strategy; Productivity & Planning; Marketing & Content; Finance & Money; Freelance & Client Work; Career & Professional Growth; Personal Growth & Wellbeing; Creator & Digital Products; Small Business Operations.

## Structure

- `index.html` - storefront and product discovery experience.
- `store.css` / `store.js` - responsive design, search, filters, an in-browser PDF reader, local companion notes and downloads.
- `products/catalog.json` - product metadata for all 210 downloads.

## Browser reading experience

Visitors can open each product in an in-browser PDF reader before downloading. The reader uses the browser's built-in PDF controls for page navigation, zoom and search, with a separate link to open the PDF in a new tab. A companion notes panel lets visitors write while reading; notes are saved locally in that browser and can be downloaded as a text file. The original PDFs remain read-only in the preview and are available as separate downloads.
- `downloads/planners/` - the 10 original planner PDFs.
- `downloads/products/` - 200 new six-page PDFs, each with a designed cover, instructions, framework, guided worksheet, reusable tracker/template and 30-day implementation plan.

## Deployment

This is a static site. Deploy the repository root on Vercel with no build command and no serverless functions required.

## Commercial status

All products are marked as free launch downloads in this release. No payment provider or paid checkout is configured. Add a secure checkout and protected file delivery before changing products to paid downloads.

## Content note

Resources are educational planning tools. They do not replace legal, tax, investment, medical or other specialist advice.

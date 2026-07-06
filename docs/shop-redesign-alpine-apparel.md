# Shop Redesign — Alpine Apparel Co (Startup Screen Printing)

**Status:** Draft — core decisions confirmed 2026-07-06 (see §2)
**Supersedes the Printful assumptions in:** `bibber-creek-shop-user-story.md`
**Vendor:** Alpine Apparel Co / Startup Screen Printing — Jesse Poteet, Castle Rock CO

---

## 1. Why this changes the design

The original shop spec assumed **Printful**: a print-on-demand service with a REST
API, a synced catalog, per-order submission, and direct drop-ship to each buyer.

Alpine Apparel is a **custom screen printer**, and the working relationship (from the
email thread) is fundamentally different:

| Dimension | Printful (old assumption) | Alpine Apparel (reality) |
|---|---|---|
| Catalog source | REST API, synced & cached | **No API.** We maintain the catalog ourselves from Jesse's quotes |
| Product type | Fixed print-on-demand products | **Custom** garments: pick a blank + decorations |
| Order submission | Per-order API call | **Bulk** submission (webhook *may* come later; export/email for now) |
| Fulfillment | Drop-ships to each customer | Ships **to the club**; club distributes at a meeting |
| Who pays the vendor | Club pays per order | **Jesse invoices the club** once per bulk order |
| Sales tax | N/A | Club is **tax-exempt**; members pay the club, club pays Jesse tax-free |
| Order tracking | Printful webhooks | Manual status (Ordered → In production → Received → Distributed) |

**Key insight:** our existing "Batch to Club" fulfillment mode ≈ Jesse's preferred bulk
workflow. So we **drop direct-ship entirely** and make batch-to-club the only model.
That simplifies the order lifecycle a lot.

---

## 2. Core design decisions (recommendations — confirm before build)

1. **Vendor-agnostic, batch-only.** Model the shop around an admin-maintained catalog
   and a periodic bulk submission to a printer. Alpine is the first "printer," but
   nothing hard-codes Alpine. *(Recommended)*

2. **We own the catalog.** Since there's no "get items" API, the admin maintains the
   catalog in our admin UI, seeded from Jesse's quote (blanks, colors, sizes,
   decorations, prices). Jesse confirms availability seasonally. Replaces the
   `printful_products` cache table.

3. **Members & parents only (login required).** No guest checkout — this ties cleanly to
   youth-member credits and matches a club-apparel use case. *(Confirmed.)* Simplifies the
   original spec, which allowed public guests.

4. **At-cost pricing (no fundraiser margin).** Member price = Jesse's cost for that
   configuration (blank + chosen decorations + the item's share of the screen fee — see
   Open Question D). No markup. *(Confirmed.)*

5. **Optional online payment (pay now *or* pay at pickup).** At checkout a member can pay
   via PayPal, or choose "pay at pickup." The club fronts Jesse's bulk invoice, then
   collects from families. This means **every order carries a payment status**
   (Paid / Unpaid / Credited), and the admin needs a "who owes what" view at distribution.
   *(Confirmed — adds reconciliation vs. pay-online-only.)*

6. **Continuous ordering, admin cuts batches ad hoc.** Members order year-round; the admin
   submits a batch to Jesse whenever there are enough orders. Messaging: "handed out after
   the next club order." *(Confirmed.)*

7. **Submission is pluggable: export now → webhook later.** Until Jesse provides a
   webhook + payload spec, "Submit batch" produces a **downloadable order sheet
   (spreadsheet/PDF)** the admin emails him — matching today's Google-Sheet process.
   When the webhook exists, the same batch payload POSTs to it. No redesign needed.

8. **Keep Member Credits + Donate.** Credits work identically (a credited item is $0 to
   the family; the club absorbs Jesse's cost). Donate is unaffected by the vendor change.

---

## 3. Catalog model (admin-maintained)

Alpine products are **customizable**, so a product isn't a single SKU — it's a template:
a base garment plus allowed decorations, option constraints, and composed pricing.

**A product (garment template) has:**
- Item type — Tee, Tank, Crew sweatshirt, Hoodie, Sweatpants (pockets / no pockets)
- Blank brand + style (e.g., `Bella 3001CVC`, `Gildan SF500`, `Gildan 18100`)
- Image(s) / mockups
- Available **colors** (e.g., Black, Army Green)
- Available **sizes**, with per-product availability (Jesse's constraints, e.g. *tanks
  not offered in youth; no YXL; youth sweatpants have no pockets*)
- **Decoration options** (each optional, each priced):
  - Front logo — placement choice: *full front* or *left chest*
  - Back name (personalization) — free-text name, "sports uniform" style
  - Sweatpants: leg logo + leg name
- Ink/print color(s) and font choice for names
- **Pricing components:** blank cost, front-print cost, name cost, logo cost
- Club-level per-batch fees: screen fee (~$30/design), optional ink-change fee
- `is_visible` (show in shop) and `credit_eligible` flags
- Member price = **at cost** (computed from the chosen options + screen-fee share); no markup

**Seed catalog (from the thread)** — the March quote gives us real starting data:

| Item | Blank | Blank $ | Logo $ | Name $ | Notes |
|---|---|---|---|---|---|
| T-Shirt | Bella 3001CVC | 5.00 | 6.00 | 5.00 | army green / black ink |
| Tank | Gildan 64200L | 4.50 | 6.00 | 5.00 | women's; limited sizes |
| Crew | Gildan SF000 | 10.25 | 6.00 | 5.00 | black |
| Hoodie | Gildan SF500 | 12.50 | 6.00 | 5.00 | black |
| Sweatpants | Gildan 18100 (pockets) | 9.00 | 7.00 (logo) | 4.00 (name) | leg logo + leg name |

Plus a **$30 screen fee** per design per batch.

---

## 4. Member ordering flow

1. Member/parent **logs in** (login required — no guest checkout) and browses `/shop`.
2. Opens a product → chooses **color, size**, and **customizations**:
   - toggle Front Logo (placement), toggle Back Name → enter the name text,
     (sweatpants: leg logo + name). Live **at-cost** price updates as options change.
3. Adds to cart. Parents can assign an item to a youth member to use a **free credit**
   (item shows $0). Cart persists across sessions.
4. Checkout: **no shipping address** ("Your items will be handed out at a club meeting").
   Choose **Pay now (PayPal)** or **Pay at pickup**. Credited-only orders are $0 and skip
   payment entirely.
5. Confirmation explains: *order is collected now; produced and handed out after the next
   club bulk order.* Shows payment status; credited orders note "pending admin approval."
6. Order status lookup shows batch progress and whether payment is still due at pickup.

---

## 5. Admin: review + bulk submission

New/*revised* admin views (replacing Printful-specific ones):

1. **Catalog management** — create/edit garment templates: blanks, colors, sizes (+
   availability), decoration options & prices, images, visibility, credit-eligibility,
   member retail price.
2. **Order queue** — all collected orders. Approve/reject credited orders (unchanged
   credits logic; shows club cost). Paid non-credited orders are auto-ready.
3. **Batch builder** — select ready orders → **review a consolidated summary** (grouped
   by item/size/color/decoration, with per-item personalization names and quantities) →
   **Submit batch**:
   - *Now:* download the batch as a **spreadsheet/PDF** and email Jesse (he quotes &
     invoices the club).
   - *Later:* POST the batch payload to Jesse's webhook.
   - Records the batch: items, submitted date, vendor invoice #, amount, status.
4. **Batch lifecycle status** — Submitted → Invoiced → Paid → In Production → Received →
   Distributed. Updated manually by the admin; members see a friendly status.

---

## 6. Payment, tax, shipping

- **Member → Club:** **optional** — PayPal at checkout *or* pay at pickup. Because
  payment is optional, the club fronts Jesse's invoice and collects from families over
  time. Every order tracks a **payment status** (Paid / Unpaid / Credited), and the admin
  gets a distribution "who owes what" view.
- **Pricing:** **at cost** — no fundraiser margin. Member price is computed from the
  garment + chosen decorations (+ the item's share of the screen fee, see Open Q D).
- **Club → Jesse:** one invoice per batch; club pays online. **Tax-exempt** — club sends
  Jesse its exemption doc so no sales tax is charged.
- **Sales tax to members:** out of scope (nonprofit cost-recovery); revisit if needed.
- **Shipping:** Jesse ships the whole batch to the **club address** (one shipping charge,
  folded into the batch cost). Families pick up at a meeting — no per-order shipping.
- **Refunds:** if an item can't be produced or an order is cancelled before a batch is
  submitted, refund any online payment and restore any credits.

---

## 7. Data model (delta from current)

- **Remove/retire:** `printful_products` (JSONB API cache) — no longer applicable.
- **`shop_products`** → becomes the garment **template**: item_type, brand_style, images,
  blank_cost, is_visible, credit_eligible, member_price_cents, + fee fields.
- **New `product_colors`, `product_sizes`** (or a JSONB `options` blob) with availability.
- **New `product_decorations`** — type (front_logo/back_name/leg_logo/leg_name),
  placement options, price_cents, requires_text (bool).
- **`orders`** — unchanged core; status enum simplified to the batch lifecycle; drops
  shipping-address fields (batch-to-club only). Add **`payment_status`**
  (PAID / UNPAID / CREDITED) and `payment_method` (paypal / at_pickup) to support optional
  online payment and the "who owes what" distribution view.
- **`order_items`** — add customization capture: chosen decorations, personalization
  text, ink color, placement; color; size.
- **New `vendor_batches`** — group of submitted orders: vendor, submitted_at, invoice_no,
  amount_cents, status, export_url. `order.batch_id` FK.
- **Member credits tables** — unchanged from the original spec.

---

## 8. Vendor integration contract (draft to send Jesse)

This directly answers the two questions in your email — reframed for "no API yet":

**Q1 (get item details): we host the catalog; we just need your product info.**
No API needed. To set up the shop, we need — per garment you'll offer — the brand/style,
item type, available colors, available sizes (and any exclusions), blank cost, and the
decoration prices (front print, back name, leg logo/name), plus the screen fee and any
ink-change fee. We'll enter these and refresh them seasonally when you update pricing.

**Q2 (submit bulk orders): proposed webhook payload.**
When you're ready, give us a URL to POST to and we'll send each batch as JSON like:

```json
{
  "club": "Bibber Creek Spurs 4-H",
  "taxExempt": true,
  "contact": { "name": "Amanda Kelley-Teng", "email": "...", "phone": "..." },
  "shipTo": { "name": "...", "address": "...", "city": "...", "state": "CO", "zip": "..." },
  "batchId": "BCS-2026-05",
  "submittedAt": "2026-05-01T00:00:00Z",
  "items": [
    {
      "garment": { "type": "Hoodie", "brandStyle": "Gildan SF500", "color": "Black", "size": "Adult M" },
      "decorations": [
        { "type": "front_logo", "placement": "full_front", "inkColor": "White" },
        { "type": "back_name", "text": "Cameran", "inkColor": "White" }
      ],
      "quantity": 1
    }
  ]
}
```

Until the webhook exists, we'll send the same information as a **spreadsheet/PDF** (the
format you already quote from) so nothing blocks going live.

---

## 9. Suggested build phasing

- **Phase A — Catalog + ordering (no payment):** admin catalog, product pages with
  customization, cart, order collection, admin order queue, batch builder with
  **spreadsheet/PDF export**. Gets the club off Google Sheets immediately.
- **Phase B — Payment:** optional PayPal at checkout + "pay at pickup"; per-order payment
  status, refunds, and the admin "who owes what" distribution view.
- **Phase C — Member credits:** credit config, balances, approval queue (per original spec).
- **Phase D — Webhook:** swap the export for Jesse's webhook when available. Donate page
  can land any time (independent).

---

## 10. Open questions

**Resolved 2026-07-06:** A → optional online payment (pay now *or* at pickup);
B → at cost (no margin); C → admin cuts batches ad hoc; F → members & parents only (login required).

Still open:
- **D. Screen fee:** absorbed by the club, amortized across the batch, or shown as a flat
  per-item share in the at-cost price? (Amortization depends on batch size, which isn't
  known until the batch is cut — so likely either club-absorbed or a fixed estimated share.)
- **E. Fonts/ink:** fixed club defaults (one font, white ink) to keep it simple, or
  member-selectable? Affects how many options the product page exposes.
- **G. Unpaid orders in a batch:** can the admin submit a batch to Jesse that includes
  "pay at pickup" (still-unpaid) orders, or must an order be paid/credited before it's
  eligible for a batch? (Recommendation: allow unpaid into a batch — the club fronts the
  cost — and track collection separately.)

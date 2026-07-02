# Member of the Day — ₹2 Payment Verification Test

A temporary ₹2 fee on **"Become the Face of Clarity"** to verify the complete
payment pipeline with a real transaction: user payment → gateway → database →
CMS → analytics → review queue → merchant account.

## How it works

| Stage | What happens | Where it's recorded |
|---|---|---|
| 1. Submit | User uploads photo + username (signed in) | `face_submissions` row, `payment_status = pending_payment` |
| 2. Order | Server creates a Razorpay order — **price comes from the CMS config server-side**, never the browser | `orders` row (`item_type = face_of_clarity`), status `pending` |
| 3. Pay | User pays ₹2 via UPI/card in the Razorpay modal | Razorpay Dashboard → Payments |
| 4. Verify | Server checks the HMAC signature, marks the order `completed`, and flips the submission to `paid` | `orders` + `face_submissions` updated atomically server-side |
| 5. Queue | Paid submission sits in the admin review queue with a `Paid ₹2` badge | Admin → Member Submissions |
| 6. Feature | Admin approves → member appears on the homepage | Public widget |

Confirmations: the user sees an on-screen confirmation with the transaction ID;
the admin sees the transaction in **Admin → Member Submissions → Payments &
end-to-end verification** (this app has no transactional email service — add one
later if email receipts are wanted).

## Admin controls (CMS)

**Admin → Member Submissions → Featuring fee** card:
- **Payments ON/OFF** — OFF restores the free submission flow instantly.
- **Amount (₹)** — enforced server-side (`site_settings.face_payment_config`).
- **Testing mode** — shows the "temporary testing fee" badge to users.

## Test matrix

Run each scenario on **desktop Chrome** and a **real phone** (Android Chrome +
iPhone Safari). Use a real ₹2 payment (live keys) or Razorpay test keys.

| # | Scenario | Steps | Expected |
|---|---|---|---|
| 1 | Successful payment | Submit → pay ₹2 via UPI | Green confirmation with Txn ID; admin table shows `completed`; submission badge `Paid ₹2` |
| 2 | Failed payment | In the modal, use a failing method (test card `4111 1111 1111 1111` with wrong CVV in test mode, or abandon a UPI request) | "Payment failed" message with reason; order stays `pending`; submission stays `Awaiting payment`; retry works |
| 3 | Cancelled payment | Open the modal, close it | "Payment cancelled — your entry is saved"; retry reuses the same submission (no duplicates) |
| 4 | Network interruption | Pay, then kill the connection before the success screen | Message shows the payment ID and "confirmation pending"; the client retries verification once automatically; if still unconfirmed, verify manually against the Dashboard |
| 5 | Duplicate protection | Pay once, then run the verification report | "No duplicate transactions" check passes; one order per payment ID |
| 6 | Mobile flow | Repeat #1 on Android Chrome and iPhone Safari | UPI intent apps open correctly; confirmation renders |

## Financial verification (merchant account)

1. **Razorpay Dashboard → Payments** — the ₹2 payment appears as `captured`,
   with the same `pay_…` ID shown in the CMS table.
2. **Dashboard → Settlements** — after Razorpay's settlement cycle (T+2/T+3
   for most accounts), the amount (minus gateway fees) appears in a settlement
   to your linked bank account.
3. **Reconciliation** — every row in the CMS Payments table must match a
   Dashboard payment 1:1. The **Run verification report** button checks the
   database half automatically:
   - payment stored in `orders` ✓
   - gateway transaction ID recorded ✓
   - submission (user record) marked paid ✓
   - no duplicate transaction IDs ✓
   - paid member entered the review queue ✓
   - revenue analytics & payment history read from the same `orders` table ✓

Revenue also appears in **Admin → Orders** (payment history, `face_of_clarity`
type) and **Admin → Analytics** (Total Revenue).

## After the test

1. Open **Admin → Member Submissions → Featuring fee**.
2. Untick **Payments ON** → Save. Submissions are free again immediately.
3. (Optional) Keep the config for a future real fee: set the amount, untick
   *testing mode*, tick *Payments ON*.

Transaction records are permanent — disabling the fee never deletes history.

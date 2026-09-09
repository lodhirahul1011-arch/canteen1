# Canteen ERP — Phase 3

Phase 3 includes operational order management, inventory control, stock ledger integration, automatic billing invoices, reporting and notifications. Payment processing is intentionally kept as a separate module and is not part of this completion pass.

## Order → Inventory → Billing flow
1. Create multi-item order.
2. Validate active member and food.
3. Atomically deduct inventory.
4. Write ORDER/ISSUE stock ledger entries.
5. Issue invoice with subtotal, tax, discount and total.
6. Staff moves order through validated lifecycle.
7. Cancellation atomically returns stock, writes RETURN ledger entries and voids invoice.
8. Billing screen lists and prints invoice details.

## Phase 3 modules
Orders, Inventory & Stock Ledger, Purchases, Billing/Invoices, Reports, Notifications.


## Phase 3 completion notes

Order, inventory, purchase and billing flows are designed around atomic multi-document transactions. MongoDB must run as a replica set or sharded cluster for these transaction-backed workflows. See MongoDB Transactions documentation for deployment requirements.

Implemented flows:
- Order creation deducts stock and writes an ORDER/ISSUE ledger entry atomically, then issues a linked invoice.
- Order cancellation returns stock and writes ORDER/RETURN ledger entries atomically, and voids the linked invoice.
- Purchase receipt increases stock and writes PURCHASE ledger entries atomically.
- Purchase cancellation reverses only the remaining received quantity; it fails safely when the stock has already been consumed.
- Manual inventory adjustment updates inventory and ledger atomically.
- Reports support date-scoped operational and billing views without depending on payment processing.
- Invoice details have a print-ready workflow that can be saved as PDF from the browser print dialog.

Production note: use a transaction-capable MongoDB deployment (replica set or sharded cluster) before enabling the transactional Order/Purchase/Inventory flows.

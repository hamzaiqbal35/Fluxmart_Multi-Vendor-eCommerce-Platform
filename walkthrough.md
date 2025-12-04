# Order Management System Update Walkthrough

This document outlines the changes made to the Order Management System to enforce strict state transitions, role-based permissions, and improved shipping tracking.

## Key Changes

### 1. Order Status Pipeline
The order status flow has been updated to:
`Pending` -> `Accepted` -> `Processing` -> `Shipped` -> `Delivered` -> `Paid` (Admin only)

- **Pending**: Initial state. Customer can cancel. Vendor can accept.
- **Accepted**: Vendor has acknowledged the order. Customer can still cancel (if not shipped). Vendor can process.
- **Processing**: Vendor is preparing the order.
- **Shipped**: Vendor has shipped the order. **Requires Tracking Number, Courier, and Estimated Delivery Date.**
- **Delivered**: Order has reached the customer.
- **Paid**: Admin marks the order as paid after delivery.

### 2. Role-Based Permissions

| Action | Customer | Vendor | Admin |
| :--- | :--- | :--- | :--- |
| **Cancel Order** | Yes (Pending/Accepted only) | Yes (If not Shipped/Delivered) | Yes (If not Shipped/Delivered) |
| **Update Status** | No | Yes (Accept, Process, Ship, Deliver) | Yes (All statuses) |
| **Mark as Paid** | No | No | Yes (Only after Delivered) |
| **Edit Order** | Yes (Pending only) | No | No |

### 3. Frontend Updates

#### Vendor Dashboard
- **New Action Buttons**: Accept, Process, Ship, Mark Delivered.
- **Shipping Modal**: A modal appears when clicking "Ship Order" to enter Courier, Tracking Number, and Estimated Delivery Date.
- **Removed**: Payment toggle button (now Admin only).

#### Admin Dashboard
- **Orders Tab**:
    - Added "Accepted" to status dropdown.
    - Added "Mark as Paid" button (visible only when status is Delivered).
    - Displays Shipping Information (Courier, Tracking, Date) for shipped orders.

#### Order Details Page
- **Status Display**: Updated to show "Accepted" status with appropriate color.
- **Cancellation**: Customers can cancel orders in "Pending" or "Accepted" state.
- **Shipping Info**: Detailed shipping information is displayed when available.

## Verification Steps

### Scenario 1: Vendor Order Flow
1.  **Login as Vendor**.
2.  Go to **Vendor Dashboard** -> **Orders**.
3.  Find a `Pending` order. Click **Accept Order**. Status should change to `Accepted`.
4.  Click **Process Order**. Status should change to `Processing`.
5.  Click **Ship Order**.
    - A modal should appear.
    - Enter Courier (e.g., TCS), Tracking Number, and Date.
    - Click **Confirm Shipment**.
    - Status should change to `Shipped`.
6.  Click **Mark Delivered**. Status should change to `Delivered`.

### Scenario 2: Customer Cancellation
1.  **Login as Customer**.
2.  Place a new order.
3.  Go to **My Orders** -> **View Order**.
4.  Verify "Cancel Order" button is visible for `Pending` status.
5.  (Optional) Ask Vendor to "Accept" the order.
6.  Refresh Order Details. "Cancel Order" should still be visible.
7.  Ask Vendor to "Ship" the order.
8.  Refresh Order Details. "Cancel Order" should **NOT** be visible.

### Scenario 3: Admin Payment
1.  **Login as Admin**.
2.  Go to **Admin Dashboard** -> **Orders**.
3.  Find a `Delivered` order.
4.  Verify "Mark as Paid" button is visible.
5.  Click it. Status should update to "Paid".
6.  Find a `Pending` or `Shipped` order. Verify "Mark as Paid" button is **NOT** visible.

## Code Changes Summary
- **Backend**: `Order.js` (Model), `orderController.js` (Logic).
- **Frontend**: `VendorDashboard.jsx`, `AdminDashboard.jsx`, `OrderDetails.jsx`.

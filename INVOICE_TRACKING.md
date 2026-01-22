# Invoice Creation Tracking & Activity Restoration

## Overview
When a user approves an invoice, the system now:
1. **Records user attribution** - Tracks which user created the invoice (userId + createdBy name)
2. **Logs the activity** - Creates an audit trail entry
3. **Persists to database** - Saves invoice and activity to database
4. **Restores on login** - When user logs back in, their activity history is automatically restored

## Architecture

### Frontend Changes

#### 1. **Invoice Store (`client/stores/invoiceStore.ts`)**
- Added `userId` field to track creator ID
- Added `createdBy` field to store creator's display name
```typescript
export interface Invoice {
  userId?: string;      // ✅ NEW: Track which user created invoice
  createdBy?: string;   // ✅ NEW: Name of user who created it
  // ... other fields
}
```

#### 2. **Activity Store (`client/stores/activityStore.ts`)**
New Zustand store for tracking user actions:
```typescript
export interface Activity {
  id: string;
  userId: string;       // Who performed the action
  userName: string;     // Display name
  action: string;       // "created_invoice", "sent_invoice", etc.
  resourceType: string; // "invoice", "project", etc.
  resourceId: string;   // Reference to the resource
  resourceName?: string;// "INV-0001", project name, etc.
  details?: Record<string, any>; // Additional metadata
  timestamp: string;    // ISO timestamp
}
```

Functions:
- `addActivity()` - Log new activity
- `getResourceActivities(resourceId)` - Get all activities for a resource
- `getRecentActivities(limit)` - Get recent activities
- `getUserActivities(userId)` - Get activities by specific user
- `hydrateActivities(activities)` - Restore from backend on login

#### 3. **Invoice Draft Screen (`client/screens/InvoiceDraftScreen.tsx`)**
When user approves invoice:
1. Adds `userId` and `createdBy` to invoice data
2. Logs activity with `addActivity()`
3. Activity automatically synced to backend

```typescript
const handleApprove = () => {
  // ... validation ...
  
  const invoiceWithUser = {
    ...invoiceData,
    userId: user?.id,
    createdBy: user?.name || user?.email,
  };
  
  const invoice = addInvoice(invoiceWithUser);
  
  // Log activity
  addActivity({
    userId: user?.id,
    userName: user?.name || user?.email,
    action: "created_invoice",
    resourceType: "invoice",
    resourceId: invoice.id,
    resourceName: invoice.invoiceNumber,
    details: { clientName, total },
  });
};
```

#### 4. **Auth Context (`client/context/AuthContext.tsx`)**
- Added `useActivityStore` import
- Hydrates activities on login via `loadUserDataFromBackend()`
- Activities restored along with invoices, projects, etc.

### Backend Changes

#### 1. **Activity Log Service (`server/activityLog.ts`)**
New service for recording activities:
```typescript
export async function logActivity(req: LogActivityRequest): Promise<void>
```

Endpoints:
- `POST /api/activity/log` - Log activity from client

#### 2. **Data Loading (`server/dataLoading.ts`)**
Enhanced to load activity logs on login:
- Added `GET /api/data/activity?userId={userId}&limit=50` endpoint
- Includes activities in `/api/data/all` response
- Fetches 50 most recent activities

```typescript
const userActivities = await db
  .select()
  .from(activityLog)
  .where(eq(activityLog.userId, userId))
  .limit(50);
```

#### 3. **Routes (`server/routes.ts`)**
- Registered `registerActivityLogRoutes(app)`

### Database Changes

#### Migration 0008: `migrations/0008_add_invoice_tracking.sql`
```sql
ALTER TABLE invoices ADD COLUMN created_by TEXT;
```

Adds tracking of who created each invoice.

## Data Flow

### Invoice Creation Flow
```
User approves invoice
    ↓
InvoiceDraftScreen.handleApprove()
    ↓
addInvoice({ userId, createdBy, ... }) → invoiceStore
addActivity({ userId, userName, action, resourceId, ... }) → activityStore
    ↓
Synced to backend (activityLog table)
    ↓
Activity appears in recent activity feed
```

### Login Flow
```
User logs in
    ↓
AuthContext.signIn() → validateCredentials()
    ↓
loadUserDataFromBackend(userId)
    ↓
Fetch activities from GET /api/data/all
    ↓
hydrateActivities(activities) → activityStore
    ↓
User sees all previous activity history
```

### Logout/Login Flow
```
User logs out (setUser = null)
    ↓
Local invoiceStore + activityStore remain in AsyncStorage
    ↓
User logs back in
    ↓
loadUserDataFromBackend() fetches fresh data from backend
    ↓
Activities restored from database (not lost)
```

## Usage Examples

### Log Invoice Creation
```typescript
// Automatically done in InvoiceDraftScreen.handleApprove()
addActivity({
  userId: user.id,
  userName: "John Smith",
  action: "created_invoice",
  resourceType: "invoice",
  resourceId: "inv-123",
  resourceName: "INV-0042",
  details: { clientName: "Acme Corp", total: 5000 },
});
```

### Log Invoice Sent
```typescript
// In SendInvoiceScreen
addActivity({
  userId: user.id,
  userName: user.name,
  action: "sent_invoice",
  resourceType: "invoice",
  resourceId: invoiceId,
  details: { method: "email", clientEmail: "client@example.com" },
});
```

### Get Recent Activities
```typescript
import { useActivityStore } from "@/stores/activityStore";

export function ActivityFeed() {
  const { getRecentActivities } = useActivityStore();
  const activities = getRecentActivities(20);
  
  return (
    <FlatList
      data={activities}
      renderItem={({ item }) => (
        <ActivityItem
          title={`${item.userName} ${item.action}`}
          description={item.details}
          timestamp={item.timestamp}
        />
      )}
    />
  );
}
```

### Get Activities for Invoice
```typescript
const invoiceActivities = useActivityStore()
  .getResourceActivities(invoiceId);

// Show: "John Smith created this invoice"
//       "Jane Doe sent this invoice via email"
```

## Testing Checklist

- [ ] Create invoice → activity logged
- [ ] Activity appears in recent feed with user name
- [ ] Log out → log back in
- [ ] Previous invoice and activity restored
- [ ] Multiple invoices show correct creator
- [ ] Activity timestamp accurate
- [ ] Invoice data persists after logout
- [ ] Activity log survives app restart
- [ ] Sync queue handles activity storage

## Future Enhancements

1. **Activity Types** - Expand to cover:
   - `paid_invoice` - When payment recorded
   - `approved_change_order` - When client approves
   - `rejected_change_order` - When client rejects
   - `exported_invoice` - When invoice downloaded

2. **Timeline View** - Show all activities on invoice detail screen

3. **Team Attribution** - Track which team member performed action

4. **Notifications** - Notify team when invoice created/sent

5. **Audit Reports** - Export activity logs for compliance

## Notes

- All activities are stored with user ID for privacy isolation
- Activities persist locally in AsyncStorage and sync to backend
- Non-blocking: Activity log failures don't interrupt primary operations
- Most recent 50 activities loaded on login (configurable limit)
- Timestamps use ISO 8601 format for consistency
- Activity details stored as JSON for extensibility

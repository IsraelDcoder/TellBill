# Project Hub Event Persistence

## Overview

Project hub events (LABOR, MATERIAL, PROGRESS, ALERT, RECEIPT) are now automatically persisted to AsyncStorage and can optionally be synced to the backend database. This ensures that recorded items are saved and can be restored when users navigate away or logout/login.

## Architecture

### Frontend Persistence

**Store:** `client/stores/projectEventStore.ts`
- **Storage:** AsyncStorage (local device persistence)
- **Scope:** All project events across all projects
- **Lifecycle:** Persists until:
  - User explicitly deletes the project
  - User clears app data
  - AsyncStorage is cleared

**Interface:**
```typescript
interface ProjectEvent {
  eventId: string;
  projectId: string;
  eventType: "LABOR" | "MATERIAL" | "PROGRESS" | "ALERT" | "RECEIPT";
  timestamp: Date;
  data: { /* event-specific data */ };
  createdAt: string;
}
```

### Frontend Integration

**ProjectHubScreen Updates:**
- ✅ Loads events from store on component mount
- ✅ Saves events to store when recording is processed
- ✅ Displays all persisted events in the timeline

**ProjectStore Updates:**
- ✅ Cascading delete: Removes all project events when project is deleted
- ✅ Ensures data consistency between projects and their events

## Recording Flow

```
User Records Audio
        ↓
Audio Processing
        ↓
Transcription Service
        ↓
Create Project Events
        ↓
Save to Store (AsyncStorage) ← PERSISTS HERE
        ↓
Display in Timeline
```

## Data Persistence Hierarchy

### Level 1: AsyncStorage (Instant, Device-Only)
- **Where:** `client/stores/projectEventStore.ts`
- **Trigger:** When events are created from recording
- **Benefit:** Instant persistence, survives app restart
- **Limitation:** Only on this device, not cloud-synced
- **Implementation:** Zustand + AsyncStorage middleware

### Level 2: Backend Database (Optional, Cloud-Synced)
- **Where:** `server/dataLoading.ts`
- **Endpoint:** `POST /api/data/project-events/:projectId`
- **Trigger:** Manual sync or future offline-sync queue
- **Benefit:** Cloud backup, sync across devices
- **Implementation:** REST API + SQLite

## API Endpoints

### GET /api/data/project-events/:projectId
Fetch all events for a specific project

**Query Parameters:**
- `userId` (required): User ID for access control

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "eventId": "...",
      "projectId": "...",
      "userId": "...",
      "eventType": "LABOR",
      "timestamp": "2024-01-15T10:30:00Z",
      "data": { /* event-specific */ },
      "createdAt": 1705316400000
    }
  ]
}
```

### POST /api/data/project-events/:projectId
Create a new event for a project

**Query Parameters:**
- `userId` (required): User ID

**Request Body:**
```json
{
  "eventType": "LABOR",
  "data": {
    "description": "Labor description",
    "labor": {
      "hours": 8,
      "ratePerHour": 50,
      "total": 400
    }
  },
  "source": "MANUAL",
  "confidence": null,
  "audioId": null
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* saved event */ }
}
```

## Implementation Details

### Event Types

| Type | Source | Fields |
|------|--------|--------|
| LABOR | Recording | `description`, `hours`, `ratePerHour`, `total` |
| MATERIAL | Recording | `name`, `quantity`, `unitPrice`, `total` |
| PROGRESS | Recording | `status`, `location` |
| ALERT | Recording | `alertType`, `severity`, `recommendedAction` |
| RECEIPT | Scan/Upload | Receipt metadata |

### Deletion Cascade

When a project is deleted via `projectStore.deleteProject(projectId)`:
1. All events for that project are deleted from store
2. Backend will cascade delete when project deleted (via FK constraint)
3. Data is permanently removed

**Code:**
```typescript
deleteProject: (id) => {
  const eventStore = useProjectEventStore.getState();
  eventStore.deleteProjectEvents(id); // ← CASCADE
  
  set((state) => ({
    projects: state.projects.filter((proj) => proj.id !== id),
  }));
}
```

## Usage Examples

### Adding Events After Recording

```typescript
import { useProjectEventStore } from "@/stores/projectEventStore";

export function ProjectHubScreen() {
  const { addEvents } = useProjectEventStore();
  const route = useRoute<RouteProps>();

  const handleRecordingProcessed = (newEvents: any[]) => {
    const persistedEvents = addEvents(
      route.params.projectId,
      newEvents.map((e) => ({
        eventType: e.eventType,
        timestamp: e.timestamp,
        data: e.data,
      }))
    );
    // Events now persisted to AsyncStorage
    setEvents((prev) => [...persistedEvents, ...prev]);
  };
}
```

### Loading Events on Project Open

```typescript
useEffect(() => {
  const loadedEvents = getProjectEvents(route.params.projectId);
  setEvents(loadedEvents);
}, [route.params.projectId, getProjectEvents]);
```

### Deleting a Project

```typescript
const handleDeleteProject = async (projectId: string) => {
  deleteProject(projectId); // Automatically cleans up all events
};
```

## Storage Analysis

### AsyncStorage Footprint

- **Per Event:** ~200-500 bytes (depending on data complexity)
- **Per Project:** 10-50 events typically = 2-25 KB
- **Full Store:** 1-2 MB typical for small-to-medium usage

**Cleanup Strategy:**
- Archive old projects periodically
- Manual deletion removes all associated events
- No automatic pruning (user-controlled)

## Testing Checklist

- [ ] Record audio and verify events appear immediately
- [ ] Close app and reopen project hub → events still visible
- [ ] Add multiple events in one recording → all persist
- [ ] Delete project → all events deleted from store
- [ ] Logout/login → projects and events restored (when backend sync added)
- [ ] Different projects → events don't mix
- [ ] Event details correct after persistence

## Future Enhancements

1. **Backend Sync Queue**
   - Offline: Events queue locally
   - Online: Sync to backend automatically
   - Status: Events marked "synced" vs "local-only"

2. **Cloud Restoration**
   - Login hydration loads events from backend
   - Cross-device access to all project events
   - Requires POST to backend after recording (not yet implemented)

3. **Event Approval Flow**
   - Client can approve/reject events
   - Approval tracking in `approvalStatus` field
   - Requires UI for approval interface

4. **Analytics**
   - Total labor hours per project
   - Material costs summary
   - Progress timeline visualization

## Migration Notes

**From Previous State (All-In-Memory):**
- Previous events in useState were lost on navigation
- Current implementation persists automatically
- No manual migration needed
- Fresh installations get empty store, grow over time

## Troubleshooting

**Events Disappearing:**
1. Check if project was deleted (cascades to events)
2. Check AsyncStorage isn't cleared (Settings → Apps → Clear Data)
3. Verify store is mounted and hooks are called

**Events Not Loading on Open:**
1. Verify `useProjectEventStore` hook is imported
2. Verify `getProjectEvents()` is called in useEffect
3. Check console for store initialization errors

**Performance Issues:**
- If store exceeds 1-2 MB, consider archiving old projects
- AsyncStorage reads are async; use loading state if needed
- Consider pagination if single project has 100+ events

## Database Schema

**Table:** `project_events`

| Column | Type | Notes |
|--------|------|-------|
| `eventId` | TEXT | Primary key, auto-generated UUID |
| `projectId` | TEXT | FK to projects, cascade delete |
| `userId` | TEXT | FK to users, cascade delete |
| `eventType` | TEXT | LABOR, MATERIAL, PROGRESS, ALERT, RECEIPT |
| `source` | TEXT | VOICE, MANUAL, IMPORT |
| `data` | TEXT | JSON-encoded event data |
| `createdAt` | TIMESTAMP_MS | Auto-set, immutable |
| `visibleToClient` | BOOLEAN | Default true |
| `approvalStatus` | TEXT | PENDING, APPROVED, REJECTED |
| `isDeleted` | BOOLEAN | Soft delete flag |

## Related Files

- `client/stores/projectEventStore.ts` - Frontend store
- `client/screens/ProjectHubScreen.tsx` - Event display & recording
- `client/stores/projectStore.ts` - Project management with cascade
- `server/dataLoading.ts` - Backend API endpoints
- `shared/schema.ts` - Database schema definition


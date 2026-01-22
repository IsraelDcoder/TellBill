# Client Portal - Web Application

Professional client-facing web portal for project tracking, progress monitoring, and change order approvals.

## Features

✨ **Key Capabilities:**
- 🔐 Token-based access (no authentication required)
- 📊 Real-time project progress tracking
- 💰 Financial summary and invoice details
- ✅ Change order approval workflow
- 📱 Fully responsive design (mobile-optimized)
- ⚡ < 2 second load time
- 🔄 Auto-refresh every 30 seconds

## Tech Stack

- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite (ultra-fast bundler)
- **Styling:** CSS3 with responsive design
- **State Management:** React Hooks (useState, useEffect)
- **API Client:** Custom TypeScript client
- **Router:** React Router v6

## Project Structure

```
web/
├── App.tsx                 # Main app component with routing
├── index.tsx              # React DOM entry point
├── index.html             # HTML template
├── vite.config.ts         # Vite build configuration
├── tsconfig.json          # TypeScript configuration
├── pages/
│   └── ClientPortalPage.tsx    # Main portal page (token handling, data fetching)
├── components/
│   ├── ProjectHeader.tsx        # Project metadata display
│   ├── InvoiceSummary.tsx       # Financial summary (sticky sidebar)
│   ├── ActivityFeed.tsx         # Timeline of activities
│   ├── ActivityItem.tsx         # Individual activity component
│   ├── ChangeOrderCard.tsx      # Change order approval interface
│   ├── ErrorBoundary.tsx        # React error catching
│   └── LoadingSpinner.tsx       # Loading indicator
├── lib/
│   └── api.ts             # API client with token management
├── styles/
│   └── portal.css         # Comprehensive styling (responsive)
└── .env.example           # Environment variables template
```

## Installation

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Setup

1. **Install dependencies:**
   ```bash
   cd web
   npm install
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env.local
   ```

3. **Configure API URL** (if not localhost):
   ```bash
   # Edit .env.local
   VITE_API_URL=https://your-api-domain.com
   ```

## Development

### Start Dev Server

```bash
npm run dev
```

- 🚀 Opens at `http://localhost:3000`
- 🔥 Hot module replacement (instant refresh)
- 📡 Auto-proxies `/api` requests to backend

### Test Portal Access

1. Generate a share token on the backend:
   ```bash
   # Backend endpoint creates token
   POST /api/client-view
   ```

2. Access portal via token:
   ```
   http://localhost:3000/view/[TOKEN]
   ```

3. Token persists in localStorage for return visits

## Build for Production

### Compile

```bash
npm run build
```

- Outputs to `web/dist/`
- Minified + tree-shaken
- Source maps (optional)

### Preview Production Build

```bash
npm run preview
```

## API Integration

### Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/client-view/:token` | Fetch project data |
| GET | `/api/client-view/:token/summary` | Fetch invoice summary |
| POST | `/api/client-view/:token/approve` | Approve/reject change order |
| POST | `/api/client-view/:token/validate` | Validate token |

### API Client (`lib/api.ts`)

```typescript
import { ClientPortalAPI } from './lib/api';

const api = new ClientPortalAPI();

// Fetch project data
const project = await api.fetchProjectData(token);

// Fetch invoice summary
const summary = await api.fetchInvoiceSummary(token);

// Approve change order
await api.approveActivity(eventId, 'approved', notes, token);

// Validate token
const valid = await api.validateToken(token);
```

## Features in Detail

### Token Management
- Extracts from URL path: `/view/[token]`
- Falls back to query string: `?token=[token]`
- Persists to localStorage for return visits
- Auto-validates on load

### Real-time Updates
- Auto-refresh every 30 seconds (configurable)
- Error recovery with exponential backoff
- Token expiration detection
- Revoked token detection

### Change Order Workflow
1. Display pending change orders
2. Show cost impact and description
3. Accept optional approval notes
4. Submit to backend
5. Show confirmation state

### Responsive Design
- **Desktop:** Sidebar layout (320px fixed)
- **Tablet:** Single column with sticky sidebar
- **Mobile:** Stacked layout, optimized touch targets
- **All:** < 2 second load time on 3G

## Styling

### Color Scheme
- **Primary:** #2563eb (Professional Blue)
- **Success:** #10b981 (Green)
- **Warning:** #f59e0b (Amber)
- **Danger:** #ef4444 (Red)

### Responsive Breakpoints
- **Desktop:** 1200px+ (sidebar layout)
- **Tablet:** 768px-1199px (flexible grid)
- **Mobile:** < 768px (stacked layout)

## Error Handling

### Token Errors
- **Expired:** Show expiration message with contact info
- **Revoked:** Display revocation message
- **Invalid:** Generic error with validation message
- **Not Found:** 404 handling

### Network Errors
- Retry with exponential backoff
- Show loading state during retry
- Display user-friendly error messages
- Provide contact information

## Performance Optimizations

- 🚀 Vite for < 1s rebuild
- 📦 Tree-shaking removes unused code
- 🖼️ CSS minification
- 🔄 Efficient re-renders with useCallback
- 📱 Mobile-first CSS
- ⚡ No external dependencies (lightweight)

## Security

- ✅ HTTPS recommended for production
- ✅ Token stored in localStorage (session-based)
- ✅ No sensitive data in URL query params
- ✅ CORS configured on backend
- ✅ Token validation on every request
- ✅ Expiration checking

## Deployment

### Static Hosting (Recommended)

1. **Build the portal:**
   ```bash
   npm run build
   ```

2. **Upload `dist/` folder to:**
   - Vercel
   - Netlify
   - AWS S3 + CloudFront
   - Azure Static Web Apps
   - Any static hosting

3. **Configure environment:**
   ```bash
   # Set VITE_API_URL in hosting platform
   VITE_API_URL=https://api.yourdomain.com
   ```

### Docker

```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY . .
RUN npm ci && npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Testing

### Manual Testing Checklist

- [ ] Token extraction from URL
- [ ] Token extraction from query string
- [ ] Token persistence to localStorage
- [ ] Project data loads correctly
- [ ] Invoice summary displays
- [ ] Activity feed renders
- [ ] Change order approval works
- [ ] Error states display correctly
- [ ] Mobile responsiveness (375px width)
- [ ] Auto-refresh triggers
- [ ] Expired token handling
- [ ] Network error recovery

## Troubleshooting

### "Cannot find module" errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### CORS errors
- Ensure backend has CORS enabled
- Verify VITE_API_URL matches backend origin
- Check that credentials are properly configured

### Portal shows "Loading" indefinitely
- Check browser console for errors
- Verify token validity
- Check API endpoint responses in Network tab
- Ensure backend is running

### Styling not applied
- Clear browser cache
- Rebuild: `npm run build`
- Check CSS file is loaded in Network tab

## Next Steps

### Phase 3: Mobile Integration
- Add "Share Progress" button to ProjectHub
- Activity log visibility options
- SMS/WhatsApp sharing

### Phase 4: Payments
- Flutterwave integration
- "Pay Invoice" button
- Payment history

### Phase 5: Analytics
- Portal visit tracking
- Change order approval rates
- Time-to-approval metrics

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review browser console logs
3. Contact support with token and error message

---

**Built with ❤️ by TellBill**

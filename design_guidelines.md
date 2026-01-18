# TellBill Design Guidelines

## Brand Identity
**Industrial Premium** aesthetic for enterprise contractors. The app should feel robust, professional, and command-center-like. Memorable element: One-tap voice recording with immediate AI processing that transforms job site chaos into polished invoices.

## Color Palette
- **Primary (Construction Gold)**: #FFB400
- **Background (Slate Grey)**: #2D2E2E
- **Surface (White)**: #FFFFFF
- **Text on Dark**: #FFFFFF
- **Text on Light**: #2D2E2E
- **Accent**: Use Construction Gold for CTAs, highlights, and active states

## Typography
- Use system fonts (SF Pro for iOS, Roboto for Android)
- **Display**: Bold, 28-32pt (hero statements)
- **Title**: Semibold, 20-24pt (screen headers)
- **Body**: Regular, 16pt (content)
- **Caption**: Regular, 14pt (metadata)

## Visual Design
- **High contrast UI** throughout
- **Glassmorphism cards** with subtle backdrop blur (10px) and 1px white border at 20% opacity
- **Large tap targets**: Minimum 60px for all interactive elements
- **Haptic feedback** on: record button tap, invoice generation complete, payment sent/received
- **Drop shadows** on floating action buttons: offset (0, 4), opacity 0.15, radius 8

## Navigation Architecture
**Root Navigation**: Bottom Tab Bar (5 tabs)
- Home (Dashboard)
- Projects
- Invoices
- Team
- Profile

**Sidebar Menu**: Drawer accessible from top-left hamburger menu (for "Coming Soon" features - locked state)

## Screen-by-Screen Specifications

### Onboarding (4 Screens)
- **Purpose**: Introduce value proposition, permissions request
- **Layout**: Full-screen vertical scroll, skip button top-right
- **Screens**: 1) Value statement, 2) Voice-first demo, 3) Permission requests (mic, location), 4) Sign up CTA

### Login/Signup
- **Purpose**: Authentication entry
- **Layout**: Centered form, logo at top
- **Components**: Email/password fields, submit button (Construction Gold), "Forgot Password" link

### Home Dashboard (Command Center)
- **Header**: Custom, transparent with greeting "Welcome, [Name]"
- **Layout**: Scrollable
- **Top Section**: Hero image (construction site), large text: "Finished the job? Just tell Bill."
- **KPI Cards**: 4 glassmorphism cards in 2x2 grid showing invoices sent/paid, total revenue, avg time saved
- **Quick Actions**: Large circular buttons: Record Voice (primary gold), Create Invoice, View History
- **Activity Feed**: Recent invoices list below

### Voice Recording
- **Header**: Title "Record Job Details", cancel button left
- **Layout**: Centered content, non-scrollable
- **Main Element**: Large pulsing record button (Construction Gold, 120px diameter)
- **Components**: Waveform visualization, live transcription text below, stop button

### Transcript Review
- **Header**: Title "Review & Edit", back button left, next button right
- **Layout**: Scrollable form
- **Components**: Editable text fields for each extracted field (client name, materials, labor hours, address, notes), AI confidence badges

### Invoice Draft
- **Header**: Title "Invoice Preview", back/edit left, approve right
- **Layout**: Scrollable preview of invoice structure
- **Components**: All invoice fields displayed as cards, total prominently shown

### Invoice Preview (PDF)
- **Header**: Title "PDF Preview", back left, send right
- **Layout**: PDF viewer embedded
- **Action**: Share/Send buttons at bottom

### Send Invoice
- **Header**: Title "Send Invoice", back left
- **Layout**: Form with send options
- **Components**: Contact method selector (SMS/WhatsApp/Email), payment link toggle, reminder schedule options, send button (Construction Gold)

### Payment Tracking
- **Header**: Title "Invoice #[number]", back left
- **Layout**: Scrollable
- **Components**: Payment status banner, timeline of reminders sent, payment link, mark as paid button

### History
- **Header**: Title "Invoices", filter icon right
- **Layout**: List view
- **Components**: Searchable invoice list, filter chips (all/paid/pending/overdue), empty state if no invoices

### Projects
- **Header**: Title "Projects", add icon right
- **Layout**: List or grid view
- **Components**: Project cards with client name, job address, status badge, tap to view details

### Team Management (Admin only)
- **Header**: Title "Team", invite icon right
- **Layout**: List view
- **Components**: Team member cards with role badge, activity summary, admin controls (assign/remove)

### Profile
- **Header**: Title "Profile", edit icon right
- **Layout**: Scrollable
- **Components**: Avatar, name/email fields, company info, logout button

### Billing/Subscription
- **Header**: Title "Billing", back left
- **Layout**: Scrollable
- **Components**: Current plan card (glassmorphism), upgrade/downgrade buttons, payment history list, cancel subscription link (nested in settings)

### Settings
- **Header**: Title "Settings", back left
- **Layout**: Scrollable list
- **Components**: Sections for Account, Notifications, Privacy, Support

### Coming Soon Pages
- **Layout**: Centered content, back button top-left
- **Components**: Feature icon, title, description, "Contact developer for early access" button (locked/disabled state)

## Assets to Generate
1. **icon.png**: TellBill logo (Construction Gold "TB" initials on Slate Grey)
2. **splash-icon.png**: Same as icon but larger
3. **hero-dashboard.png**: Construction site header image for dashboard
4. **empty-invoices.png**: Invoice stack illustration for empty invoice list
5. **empty-projects.png**: Folder illustration for empty projects list
6. **empty-team.png**: User group illustration for empty team list
7. **onboarding-1.png**: Voice wave illustration for onboarding screen 1
8. **onboarding-2.png**: Mobile phone with invoice for screen 2

All illustrations must use Slate Grey and Construction Gold palette, industrial/technical style.
# Testing Checklist - 4-Tier Pricing & Scope Proof Features

**Date**: January 28, 2026  
**Backend URL**: 10.64.118.139:3000 (for phone testing)  
**Status**: Testing before GitHub push

## 1. Authentication & Login ✅/❌
- [ ] App starts without crashes
- [ ] Login screen appears
- [ ] Can create new account
- [ ] Can login with existing account
- [ ] Auth context properly initialized

## 2. Free Tier Features ✅/❌
- [ ] Free plan shows "Trial Only" badge
- [ ] Free plan shows correct limitations (3 recordings, 3 invoices lifetime)
- [ ] Features list shows ❌ for locked features
- [ ] "Upgrade to Professional" CTA appears

## 3. Billing Screen - New Pricing Structure ✅/❌
- [ ] All 4 tiers display correctly (Free, Solo, Professional, Enterprise)
- [ ] Pricing amounts correct: Solo $29, Professional $79, Enterprise $299
- [ ] Professional shows "⭐ Most Popular" badge with gold color
- [ ] Plan taglines display correctly:
  - Free: "This works… but I can't run my business like this."
  - Solo: "I'm faster and organized… but extras can still slip."
  - Professional: "Never do unpaid work again."
  - Enterprise: "This runs part of my business."
- [ ] Feature lists show correct ✅/❌ for each tier
- [ ] Current plan highlighted with border and icon
- [ ] Colors match tier identity (gold for Professional)

## 4. Payment Flow - Solo Tier ✅/❌
- [ ] Click "Upgrade Now" on Solo plan
- [ ] Flutterwave payment modal opens
- [ ] Amount shows $29.00
- [ ] Can process test payment
- [ ] After success, app updates to Solo plan
- [ ] Payment history shows $29.00 transactions

## 5. Payment Flow - Professional Tier ✅/❌
- [ ] Click "Upgrade Now" on Professional plan
- [ ] Flutterwave payment modal opens
- [ ] Amount shows $79.00 (NOT $29.00)
- [ ] Can process test payment
- [ ] After success, app updates to Professional plan
- [ ] Payment history shows $79.00 transactions
- [ ] Scope Proof features unlock

## 6. Payment Flow - Enterprise Tier ✅/❌
- [ ] Click "Upgrade Now" on Enterprise plan
- [ ] Flutterwave payment modal opens
- [ ] Amount shows $299.00
- [ ] Can process test payment
- [ ] After success, app updates to Enterprise plan
- [ ] Payment history shows $299.00 transactions

## 7. Scope Proof Feature (Professional Tier) ✅/❌
- [ ] Upgrade to Professional plan
- [ ] Navigate to applicable screen with Scope Proof option
- [ ] Voice recording to invoice conversion works
- [ ] Scope drift detection triggers (AI analysis)
- [ ] Can take photo with timestamp
- [ ] Client approval link generates correctly
- [ ] Can send approval link via email/WhatsApp
- [ ] 24-hour approval timer works
- [ ] Auto-add approved work to invoice functions
- [ ] Dispute-ready logs save correctly

## 8. Feature Access Control ✅/❌
- [ ] Free tier: Receipt scanning locked
- [ ] Free tier: Projects locked
- [ ] Free tier: Scope Proof locked
- [ ] Solo tier: Scope Proof locked (locked feature overlay appears)
- [ ] Professional tier: All Scope Proof features unlocked
- [ ] Enterprise tier: All features unlocked with priority badge

## 9. Backend Compatibility ✅/❌
- [ ] Server starts without errors: `npm run server:dev`
- [ ] Payment endpoints respond correctly
- [ ] Plan validation accepts: solo, professional, enterprise (NOT team)
- [ ] Subscription state updates correctly
- [ ] Database stores new plan names correctly

## 10. Database & Data Integrity ✅/❌
- [ ] Users table has `currentPlan` field with new values
- [ ] No "team" plan references in database
- [ ] Subscription history tracks correct prices
- [ ] Payment records save plan correctly

## 11. UI/UX Polish ✅/❌
- [ ] No TypeScript compilation errors
- [ ] No runtime errors or console crashes
- [ ] Responsive layout on different screen sizes
- [ ] Text formatting and colors display correctly
- [ ] Plan card styling matches design (gold for Professional)
- [ ] Buttons respond to taps
- [ ] Loading states show during payment

## 12. Navigation & Transitions ✅/❌
- [ ] Can navigate between screens after upgrade
- [ ] Billing screen updates when plan changes
- [ ] Success screen shows after payment
- [ ] Can return to home after upgrade
- [ ] Deep links work correctly for payment callbacks

## 13. Error Handling ✅/❌
- [ ] Missing email shows proper alert
- [ ] Missing name shows proper alert
- [ ] Payment failure shows error message
- [ ] Network errors handled gracefully
- [ ] Invalid plan type rejected by backend

## 14. Scope Proof Testing Flow ✅/❌
Follow [SCOPE_PROOF_TESTING_GUIDE.md](./SCOPE_PROOF_TESTING_GUIDE.md) for comprehensive testing

---

## Testing Notes

### Device Configuration
- Backend: 10.64.118.139:3000
- Device: Phone connected to same network
- Use Flutterwave test credentials

### Test Accounts
- Email: testuser@example.com
- Phone: +234XXXXXXXXXX

### Common Issues to Watch For
- [ ] Plan not updating after payment
- [ ] Incorrect amounts in Flutterwave modal
- [ ] Scope Proof features locked on Professional
- [ ] Type errors with "professional" vs "team"
- [ ] Payment history showing wrong amounts

---

## Sign-Off
- [ ] All tests passed
- [ ] No critical bugs found
- [ ] Ready to push to GitHub
- Tester: _______________
- Date: _______________

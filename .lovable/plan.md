

# Free Plan Usage Limits and Premium Upgrade Modal

## Overview
Add a subscription/usage tracking system that enforces free-tier limits across four features, with a polished Premium upgrade modal.

## What Will Be Built

### 1. Database: `usage_events` Table
A new table to persist every usage event with timestamps, enabling the 24-hour rolling window check.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | References auth user |
| feature | text | One of: `outfit_suggest`, `virtual_tryon`, `style_chat` |
| created_at | timestamptz | When the action occurred |

RLS policies: users can only insert/read their own events. Wardrobe count is already tracked via `clothing_items` table (no new table needed).

### 2. `useUsageLimits` Hook
A centralized React hook that:
- Queries `clothing_items` count for the wardrobe limit (20 max)
- Queries `usage_events` for the last 24 hours, grouped by feature
- Returns usage counts and boolean flags (`canSuggestOutfit`, `canTryOn`, `canChat`, `canUploadClothing`)
- Provides a `recordUsage(feature)` function that inserts a row and refreshes counts
- Returns `chatMessagesLeft` (5 minus count)

### 3. Premium Upgrade Modal Component
A reusable `<PremiumUpgradeModal>` dialog with:
- Feature highlights: Unlimited Wardrobe, Unlimited AI Suggestions, Unlimited Try-Ons, 24/7 Personal Stylist Access
- Two pricing buttons: Monthly ($9.99) and Yearly ($95.99 -- Save 20%)
- Buttons are non-functional for now (no payment integration yet) -- they show a "Coming Soon" toast
- Accepts a `trigger` prop describing which limit was hit (shown as heading text)

### 4. Page-Level Integrations

**Wardrobe Page:**
- Add a progress bar at top: "14/20 slots used" with the `<Progress>` component
- When count reaches 20, disable the upload button and show a tooltip
- Clicking disabled button opens Premium modal

**Outfit Suggest Page:**
- Before calling `suggestMutation.mutate()`, check `canSuggestOutfit`
- If blocked, open Premium modal with "Daily Limit Reached" message
- Show remaining count near the generate button: "1/2 suggestions left today"
- After successful generation, call `recordUsage('outfit_suggest')`

**Virtual Try-On Page:**
- Same pattern: check `canTryOn` before mutation
- Show "1/2 try-ons left today" indicator
- Open Premium modal when limit hit
- Record usage after success

**Style Chat Page:**
- Show "3/5 messages left" counter in the chat input area
- Before sending, check `canChat`
- If blocked, open Premium modal
- Record usage after each sent message

## Technical Details

### New Files
- `src/hooks/useUsageLimits.ts` -- the centralized hook
- `src/components/PremiumUpgradeModal.tsx` -- the modal component

### Modified Files
- `src/pages/Wardrobe.tsx` -- add progress bar, disable upload at 20, premium modal trigger
- `src/pages/OutfitSuggest.tsx` -- add limit check before generation, usage recording, remaining counter
- `src/pages/VirtualTryOn.tsx` -- add limit check before generation, usage recording, remaining counter
- `src/pages/StyleChat.tsx` -- add message counter, limit check before send, usage recording
- `src/components/chat/ChatInput.tsx` -- accept and display `messagesLeft` prop

### Database Migration
One migration to create the `usage_events` table with RLS policies.

### 24-Hour Rolling Window Logic
The hook queries: `SELECT count(*) FROM usage_events WHERE user_id = ? AND feature = ? AND created_at > now() - interval '24 hours'`

This is done via Supabase JS with a `.gte('created_at', twentyFourHoursAgo.toISOString())` filter, ensuring the rolling window works correctly regardless of midnight boundaries.


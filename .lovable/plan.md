
# Dynamic Dashboard UI Enhancements

Implementing features 1, 2, 4, 6, 7, and 8 from the approved plan to make the tarzly.ai dashboard feel alive and premium.

---

## 1. Animated Weather Widget with Live Effects

Add subtle CSS/framer-motion animated weather effects (rain drops, sun rays, floating clouds) to the WeatherWidget based on the current weather description. The animations will be lightweight and layered behind the text content.

## 2. Skeleton Loading States

Replace the plain spinner in Dashboard.tsx with a shimmer skeleton layout that mirrors the actual dashboard structure (weather card, quick actions grid, stats row, action cards). Uses the existing `Skeleton` UI component.

## 4. Animated Stats Counters

When stats appear, numbers count up from 0 to the final value using framer-motion's `useMotionValue` and `animate`. Creates a satisfying "ticking up" effect.

## 6. Floating Action Button (FAB)

Add a mobile-only FAB ("+" button) in the bottom-right corner that expands into a radial menu with 3 quick actions: Add Clothing, Get Outfit, Start Chat. Uses `AnimatePresence` for smooth expand/collapse.

## 7. Card Press/Tap Feedback

Enhance ActionCards and QuickActions with `whileTap={{ scale: 0.97 }}` and `whileHover={{ scale: 1.02 }}` via framer-motion for tactile press feedback on every interactive card.

## 8. Outfit of the Day Hero Card

Add a featured card at the top of the dashboard (below greeting) that shows the user's most recent outfit suggestion with a gradient overlay and parallax-like entrance animation. If no outfits exist, show a stylish CTA to get their first suggestion.

---

## Technical Details

### New files to create
- `src/components/dashboard/AnimatedCounter.tsx` -- Counter that animates from 0 to target value
- `src/components/dashboard/DashboardSkeleton.tsx` -- Full skeleton loading layout
- `src/components/dashboard/WeatherEffects.tsx` -- Animated rain/sun/cloud overlay components
- `src/components/dashboard/OutfitOfTheDay.tsx` -- Hero card for latest outfit
- `src/components/FloatingActionButton.tsx` -- Expandable FAB with radial menu

### Files to modify
- `src/components/dashboard/WeatherWidget.tsx` -- Integrate weather effect overlays
- `src/components/dashboard/StatsRow.tsx` -- Use AnimatedCounter for numbers
- `src/components/dashboard/ActionCards.tsx` -- Add whileTap/whileHover motion props
- `src/components/dashboard/QuickActions.tsx` -- Add whileTap/whileHover motion props
- `src/pages/Dashboard.tsx` -- Add skeleton state, OutfitOfTheDay, FAB
- `src/lib/i18n.ts` -- New translation keys for outfit of the day, FAB labels

### Dependencies
- No new dependencies needed; all animations use framer-motion (already installed)
- Skeleton uses existing `src/components/ui/skeleton.tsx`

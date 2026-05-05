

## Problem

The "Missing required data" error comes from the mutation guard in `VirtualTryOn.tsx` which checks three conditions: auth session, selected items, and `userImage`. The root cause is a bug where `useState` is used instead of `useEffect` to sync the profile's full-body photo into the `userImage` state.

```
useState(() => { ... })  // BUG: runs once at render, profile is still null
```

The profile data loads asynchronously, so when this runs, `profile` is always `null`. The photo appears on screen because `displayImage` has a fallback (`userImage || profile?.full_body_photo_url`), but the actual `userImage` state used in the mutation check stays `null`.

## Fix

1. **Replace `useState` with `useEffect`** (lines 49-53 of `VirtualTryOn.tsx`)
   - Add a `useEffect` that watches `profile` and sets `userImage` when `full_body_photo_url` is available

2. **Update the mutation guard** to also accept `displayImage` as valid
   - Change `!userImage` to `!displayImage` so that a profile photo counts
   - Pass `displayImage` (instead of `userImage`) in the edge function call body

These two small changes will resolve the issue without affecting any other functionality.

## Technical Details

**File:** `src/pages/VirtualTryOn.tsx`

- Replace the incorrect `useState(() => { ... })` block with:
  ```typescript
  useEffect(() => {
    if ((profile as any)?.full_body_photo_url && !userImage) {
      setUserImage((profile as any).full_body_photo_url);
    }
  }, [profile]);
  ```

- In the mutation, use `displayImage` instead of `userImage`:
  ```typescript
  if (!session || selectedItems.length === 0 || !displayImage) {
    throw new Error("Missing required data");
  }
  ```
  And pass `displayImage` in the request body:
  ```typescript
  userImageBase64: displayImage,
  ```


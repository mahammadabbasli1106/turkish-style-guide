type WardrobeItem = {
  id: string;
  name: string;
  image_url: string;
};

/**
 * Scan AI message text and find wardrobe items mentioned by name.
 * Uses a simple substring/token matching approach.
 */
export function findMentionedItems(
  messageText: string,
  wardrobeItems: WardrobeItem[]
): WardrobeItem[] {
  if (!wardrobeItems?.length || !messageText) return [];

  const lowerText = messageText.toLowerCase();
  const matched: WardrobeItem[] = [];
  const seenIds = new Set<string>();

  for (const item of wardrobeItems) {
    if (seenIds.has(item.id)) continue;

    const itemName = item.name.toLowerCase();
    // Direct substring match
    if (lowerText.includes(itemName)) {
      matched.push(item);
      seenIds.add(item.id);
      continue;
    }

    // Token-based: if item name has 2+ words, check if most tokens appear
    const tokens = itemName.split(/\s+/).filter((t) => t.length > 2);
    if (tokens.length >= 2) {
      const hits = tokens.filter((token) => lowerText.includes(token)).length;
      if (hits >= Math.ceil(tokens.length * 0.7)) {
        matched.push(item);
        seenIds.add(item.id);
      }
    }
  }

  return matched.slice(0, 6); // Max 6 cards
}

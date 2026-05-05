// Style streak rewards configuration
// Levels are based on total check-ins. Level 1 = 0-9, Level 2 = 10-19, etc.
// (10 check-ins per level — matches existing getLevel logic)

export type Reward = {
  level: number;
  name: string;
  description: string;
  icon: string; // emoji
};

export const REWARDS: Reward[] = [
  {
    level: 1,
    name: "Welcome",
    description: "Start your style journey",
    icon: "✨",
  },
  {
    level: 2,
    name: "Style Tips",
    description: "Personalized tips for your body type",
    icon: "💡",
  },
  {
    level: 3,
    name: "Color Palette Analysis",
    description: "AI analyzes which colors suit you",
    icon: "🎨",
  },
  {
    level: 4,
    name: "Priority AI",
    description: "Your suggestions are processed first",
    icon: "⚡",
  },
  {
    level: 5,
    name: "1 Free Premium Week",
    description: "Unlimited suggestions for 7 days",
    icon: "👑",
  },
];

const CHECKINS_PER_LEVEL = 10;

export function getLevel(checkins: number): number {
  return Math.floor(checkins / CHECKINS_PER_LEVEL) + 1;
}

export function getCheckinsIntoLevel(checkins: number): number {
  return checkins % CHECKINS_PER_LEVEL;
}

export function getCheckinsToNextLevel(checkins: number): number {
  return CHECKINS_PER_LEVEL - getCheckinsIntoLevel(checkins);
}

export function getProgressInLevel(checkins: number): number {
  return getCheckinsIntoLevel(checkins) / CHECKINS_PER_LEVEL;
}

export function getNextReward(checkins: number): Reward | null {
  const level = getLevel(checkins);
  return REWARDS.find((r) => r.level === level + 1) || null;
}

export function getCurrentReward(checkins: number): Reward {
  const level = getLevel(checkins);
  return REWARDS.find((r) => r.level === level) || REWARDS[REWARDS.length - 1];
}

export function calculateConsecutiveStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const sorted = dates
    .map((d) => new Date(d))
    .sort((a, b) => b.getTime() - a.getTime());

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const mostRecent = new Date(sorted[0]);
  mostRecent.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((today.getTime() - mostRecent.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > 1) return 0;

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    prev.setHours(0, 0, 0, 0);
    curr.setHours(0, 0, 0, 0);
    const gap = Math.floor((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24));
    if (gap === 1) streak++;
    else break;
  }
  return streak;
}

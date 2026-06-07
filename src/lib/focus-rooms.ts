export type FocusRoom = {
  id: string;
  slug: string;
  name: string;
  description: string;
  emoji: string;
  active: number;
  capacity: number;
  locked: boolean;
  tags: string[];
  timerModes: { label: string; focus: number; break: number }[];
};

export const focusRooms: FocusRoom[] = [
  {
    id: "study-strangers",
    slug: "study-with-strangers",
    name: "Study with Strangers",
    description: "Quiet co-working vibes. Camera optional. Just show up and focus.",
    emoji: "📚",
    active: 0,
    capacity: 100,
    locked: false,
    tags: ["Co-working", "Quiet"],
    timerModes: [
      { label: "50/10", focus: 50, break: 10 },
      { label: "25/5", focus: 25, break: 5 },
    ],
  },
  {
    id: "silent-focus",
    slug: "silent-focus-room",
    name: "Silent Focus Room",
    description: "Strict silence. No talking, no chat. Pure deep work.",
    emoji: "🤫",
    active: 0,
    capacity: 200,
    locked: false,
    tags: ["Deep Work", "Silence"],
    timerModes: [
      { label: "50/10", focus: 50, break: 10 },
      { label: "90/15", focus: 90, break: 15 },
    ],
  },
  {
    id: "morning-pomodoro",
    slug: "morning-pomodoro",
    name: "☕ Morning Pomodoro",
    description: "25 min focus + 5 min break. Guided by the room host. Starts every hour.",
    emoji: "☕",
    active: 0,
    capacity: 50,
    locked: false,
    tags: ["Pomodoro", "Guided"],
    timerModes: [
      { label: "25/5", focus: 25, break: 5 },
      { label: "50/10", focus: 50, break: 10 },
    ],
  },
  {
    id: "body-double",
    slug: "body-double-session",
    name: "Body Double Session",
    description: "Work alongside others in real-time. Presence = productivity.",
    emoji: "👥",
    active: 0,
    capacity: 30,
    locked: false,
    tags: ["Body Double", "Co-work"],
    timerModes: [
      { label: "50/10", focus: 50, break: 10 },
      { label: "25/5", focus: 25, break: 5 },
    ],
  },
  {
    id: "premium-deep-work",
    slug: "premium-deep-work-lab",
    name: "Premium Deep Work Lab",
    description: "Extended 90-min deep focus blocks. Premium members only. Hosted daily.",
    emoji: "🔬",
    active: 0,
    capacity: 25,
    locked: true,
    tags: ["Premium", "90 min"],
    timerModes: [
      { label: "90/15", focus: 90, break: 15 },
      { label: "50/10", focus: 50, break: 10 },
    ],
  },
  {
    id: "creative-flow",
    slug: "creative-flow-zone",
    name: "Creative Flow Zone",
    description: "For writers, designers, and creators. Soft background lofi. No judgment.",
    emoji: "🎨",
    active: 0,
    capacity: 20,
    locked: false,
    tags: ["Creative", "Lofi"],
    timerModes: [
      { label: "25/5", focus: 25, break: 5 },
      { label: "50/10", focus: 50, break: 10 },
    ],
  },
];

const STORAGE_KEY = "clarity-room-state";

type RoomState = Record<string, { joined: boolean }>;

function getRoomStates(): RoomState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveRoomStates(states: RoomState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(states));
}

export function getRoomBySlug(slug: string): FocusRoom | undefined {
  return focusRooms.find((r) => r.slug === slug);
}

export function isJoinedInRoom(slug: string): boolean {
  return getRoomStates()[slug]?.joined ?? false;
}

export function joinRoom(slug: string): FocusRoom | undefined {
  const room = focusRooms.find((r) => r.slug === slug);
  if (!room || room.locked) return undefined;
  const states = getRoomStates();
  if (!states[slug]?.joined) {
    states[slug] = { joined: true };
    saveRoomStates(states);
    room.active += 1;
  }
  return room;
}

export function leaveRoom(slug: string): FocusRoom | undefined {
  const room = focusRooms.find((r) => r.slug === slug);
  if (!room) return undefined;
  const states = getRoomStates();
  if (states[slug]?.joined) {
    states[slug] = { joined: false };
    saveRoomStates(states);
    room.active = Math.max(0, room.active - 1);
  }
  return room;
}
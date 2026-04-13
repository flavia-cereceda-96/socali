export type EventStatus = 'suggested' | 'maybe' | 'confirmed' | 'declined';

export interface Friend {
  id: string;
  name: string;
  avatar: string;
  emoji: string;
}

export interface EventParticipant {
  friend: Friend;
  status: EventStatus;
}

export interface SocialEvent {
  id: string;
  title: string;
  emoji: string;
  date: Date;
  time: string;
  location?: string;
  participants: EventParticipant[];
  createdBy: string;
}

export const friends: Friend[] = [
  { id: '1', name: 'Alex', avatar: '', emoji: '😎' },
  { id: '2', name: 'Jordan', avatar: '', emoji: '🎨' },
  { id: '3', name: 'Sam', avatar: '', emoji: '🏃' },
  { id: '4', name: 'Taylor', avatar: '', emoji: '🎵' },
  { id: '5', name: 'Casey', avatar: '', emoji: '📚' },
  { id: '6', name: 'Morgan', avatar: '', emoji: '🍳' },
];

const today = new Date();
const day = (offset: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offset);
  return d;
};

export const events: SocialEvent[] = [
  {
    id: '1',
    title: 'Dinner',
    emoji: '🍝',
    date: day(0),
    time: '7:30 PM',
    location: 'Little Italy',
    participants: [
      { friend: friends[0], status: 'confirmed' },
      { friend: friends[1], status: 'confirmed' },
      { friend: friends[3], status: 'maybe' },
    ],
    createdBy: 'you',
  },
  {
    id: '2',
    title: 'Morning Run',
    emoji: '🏃',
    date: day(1),
    time: '7:00 AM',
    location: 'Central Park',
    participants: [
      { friend: friends[2], status: 'confirmed' },
    ],
    createdBy: 'you',
  },
  {
    id: '3',
    title: 'Movie Night',
    emoji: '🎬',
    date: day(2),
    time: '8:00 PM',
    participants: [
      { friend: friends[0], status: 'suggested' },
      { friend: friends[1], status: 'maybe' },
      { friend: friends[4], status: 'confirmed' },
    ],
    createdBy: friends[0].name,
  },
  {
    id: '4',
    title: 'Brunch',
    emoji: '🥞',
    date: day(4),
    time: '11:00 AM',
    location: 'Café Bloom',
    participants: [
      { friend: friends[5], status: 'suggested' },
      { friend: friends[3], status: 'suggested' },
    ],
    createdBy: 'you',
  },
  {
    id: '5',
    title: 'Game Night',
    emoji: '🎮',
    date: day(6),
    time: '6:00 PM',
    participants: [
      { friend: friends[0], status: 'confirmed' },
      { friend: friends[2], status: 'confirmed' },
      { friend: friends[4], status: 'maybe' },
      { friend: friends[5], status: 'suggested' },
    ],
    createdBy: friends[2].name,
  },
];

export const feedInsights = [
  { type: 'nudge' as const, text: "You haven't seen Morgan in a while 🤔", friendId: '6' },
  { type: 'free' as const, text: "You're free Thursday evening ✨" },
  { type: 'invite' as const, text: "Alex invited you to Movie Night 🎬", eventId: '3' },
];

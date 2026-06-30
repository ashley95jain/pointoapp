export type MissionId = 'install' | 'walk' | 'invite';

export type Mission = {
  id: MissionId;
  title: string;
  description: string;
  points: number;
  completed: boolean;
};

export const initialMissions: Mission[] = [
  {
    id: 'install',
    title: 'Install through a referral link',
    description: 'Get 300 points for installing Pointo from a trusted referral.',
    points: 300,
    completed: false,
  },
  {
    id: 'walk',
    title: 'Walk and earn',
    description: 'Complete a 10,000-step challenge and unlock 500 points.',
    points: 500,
    completed: false,
  },
  {
    id: 'invite',
    title: 'Invite a friend in Japan',
    description: 'Share your referral code and earn another 250 points.',
    points: 250,
    completed: false,
  },
];

export const DEFAULT_REFERRAL_CODE = 'POINTO-JP-7H2K';
export const INITIAL_POINTS = 120;

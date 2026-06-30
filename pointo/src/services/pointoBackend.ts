import type { SupabaseClient } from '@supabase/supabase-js';
import {
  DEFAULT_REFERRAL_CODE,
  INITIAL_POINTS,
  initialMissions,
  type Mission,
  type MissionId,
} from '../data/missions';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { Database, Json } from '../lib/database.types';

export type AuthFormState = {
  name: string;
  phone: string;
};

export type BackendMode = 'demo' | 'supabase';

export type AppSnapshot = {
  profileId?: string;
  name: string;
  phone: string;
  points: number;
  missions: Mission[];
  referralCode: string;
  referralUrl: string;
  backendMode: BackendMode;
};

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type PointoClient = SupabaseClient<Database>;

const pointoAppHost = process.env.EXPO_PUBLIC_POINTO_APP_HOST || 'https://pointo.app';

function buildReferralUrl(referralCode: string) {
  return `${pointoAppHost.replace(/\/$/, '')}/join/${referralCode}`;
}

function cloneDemoMissions(): Mission[] {
  return initialMissions.map((mission) => ({ ...mission }));
}

export function createDemoSnapshot(form?: Partial<AuthFormState>): AppSnapshot {
  return {
    name: form?.name?.trim() || 'Aiko',
    phone: form?.phone?.trim() || '080-1234-5678',
    points: INITIAL_POINTS,
    missions: cloneDemoMissions(),
    referralCode: DEFAULT_REFERRAL_CODE,
    referralUrl: buildReferralUrl(DEFAULT_REFERRAL_CODE),
    backendMode: isSupabaseConfigured ? 'supabase' : 'demo',
  };
}

export function validateAuthForm(form: AuthFormState): AuthFormState {
  const name = form.name.trim();
  const phone = form.phone.trim();

  if (!name || !phone) {
    throw new Error('Please enter your name and phone number to continue.');
  }

  return { name, phone };
}

function toReferralCode(name: string, phone: string) {
  const namePart = name.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 4) || 'JP';
  const phonePart = phone.replace(/\D/g, '').slice(-4) || '0000';
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `POINTO-${namePart}-${phonePart}${randomPart}`;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'object' && error && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message) {
      return message;
    }
  }

  return fallback;
}

async function getOrCreateProfile(client: PointoClient, form: AuthFormState) {
  const { data: existingProfile, error: findError } = await client
    .from('profiles')
    .select('id,name,phone,referral_code,referred_by,created_at,updated_at')
    .eq('phone', form.phone)
    .maybeSingle();

  if (findError) {
    throw new Error(findError.message);
  }

  if (existingProfile) {
    if (existingProfile.name === form.name) {
      return existingProfile;
    }

    const { data: updatedProfile, error: updateError } = await client
      .from('profiles')
      .update({ name: form.name })
      .eq('id', existingProfile.id)
      .select('id,name,phone,referral_code,referred_by,created_at,updated_at')
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    return updatedProfile;
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data: createdProfile, error: createError } = await client
      .from('profiles')
      .insert({
        name: form.name,
        phone: form.phone,
        referral_code: toReferralCode(form.name, form.phone),
      })
      .select('id,name,phone,referral_code,referred_by,created_at,updated_at')
      .single();

    if (!createError) {
      return createdProfile;
    }

    if (createError.code !== '23505') {
      throw new Error(createError.message);
    }
  }

  throw new Error('Could not create a unique referral code. Please try again.');
}

async function ensureSignupBonus(client: PointoClient, profileId: string) {
  const { count, error: countError } = await client
    .from('point_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .eq('reason', 'signup_bonus');

  if (countError) {
    throw new Error(countError.message);
  }

  if (count && count > 0) {
    return;
  }

  const metadata: Json = { source: 'app_login' };
  const { error: insertError } = await client.from('point_transactions').insert({
    profile_id: profileId,
    amount: INITIAL_POINTS,
    reason: 'signup_bonus',
    metadata,
  });

  if (insertError) {
    throw new Error(insertError.message);
  }
}

async function fetchSnapshot(client: PointoClient, profile: ProfileRow): Promise<AppSnapshot> {
  const [
    { data: remoteMissions, error: missionsError },
    { data: completions, error: completionsError },
    { data: transactions, error: transactionsError },
  ] = await Promise.all([
    client
      .from('missions')
      .select('id,title,description,points,active,sort_order,created_at')
      .eq('active', true)
      .order('sort_order', { ascending: true }),
    client
      .from('mission_completions')
      .select('mission_id')
      .eq('profile_id', profile.id),
    client
      .from('point_transactions')
      .select('amount')
      .eq('profile_id', profile.id),
  ]);

  if (missionsError) throw new Error(missionsError.message);
  if (completionsError) throw new Error(completionsError.message);
  if (transactionsError) throw new Error(transactionsError.message);

  const completedMissionIds = new Set(
    (completions ?? []).map((completion) => completion.mission_id),
  );
  const missionSource = remoteMissions?.length ? remoteMissions : cloneDemoMissions();
  const missions = missionSource.map((mission) => ({
    id: mission.id,
    title: mission.title,
    description: mission.description,
    points: mission.points,
    completed: completedMissionIds.has(mission.id),
  }));
  const points = (transactions ?? []).reduce(
    (total, transaction) => total + transaction.amount,
    0,
  );

  return {
    profileId: profile.id,
    name: profile.name,
    phone: profile.phone,
    points,
    missions,
    referralCode: profile.referral_code,
    referralUrl: buildReferralUrl(profile.referral_code),
    backendMode: 'supabase',
  };
}

export async function loginWithBackend(form: AuthFormState) {
  try {
    const validatedForm = validateAuthForm(form);

    if (!supabase) {
      return { ok: true as const, snapshot: createDemoSnapshot(validatedForm) };
    }

    const profile = await getOrCreateProfile(supabase, validatedForm);
    await ensureSignupBonus(supabase, profile.id);
    const snapshot = await fetchSnapshot(supabase, profile);

    return { ok: true as const, snapshot };
  } catch (error) {
    return {
      ok: false as const,
      reason: getErrorMessage(error, 'Could not sign in. Please try again.'),
    };
  }
}

export async function claimMissionWithBackend(
  profileId: string,
  missionId: MissionId,
  currentMissions: Mission[],
) {
  if (!supabase) {
    return undefined;
  }

  const { data, error } = await supabase.rpc('claim_mission', {
    p_profile_id: profileId,
    p_mission_id: missionId,
  });

  if (error) {
    throw new Error(error.message);
  }

  const claimed = data?.[0];
  if (!claimed) {
    throw new Error('Mission claim did not return a point balance.');
  }

  const updatedMission: Mission = {
    id: claimed.mission_id,
    title: claimed.mission_title,
    description: claimed.mission_description,
    points: claimed.mission_points,
    completed: true,
  };
  const missions = currentMissions.map((mission) =>
    mission.id === claimed.mission_id ? updatedMission : mission,
  );

  return {
    mission: updatedMission,
    missions,
    points: claimed.points_balance,
  };
}

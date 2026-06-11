export type TournamentState = 'pre_tournament' | 'group_stage' | 'knockouts' | 'finished';

export const LOCK_PART1_DATE = new Date('2026-06-11T20:00:00Z'); // 3:00 PM Bogota / 20:00 UTC / 4:00 PM ET del 11 de Junio de 2026

// Fecha de finalización de la fase de grupos (Final del último partido de grupos)
export const END_GROUPS_DATE = new Date('2026-06-27T23:59:59Z');

// Fecha de finalización de la Copa del Mundo (Posterior a la Final del 19 de Julio)
export const END_TOURNAMENT_DATE = new Date('2026-07-19T23:59:59Z');

export function getTournamentState(dateInput: string | Date | number): TournamentState {
  const date = new Date(dateInput);
  const time = date.getTime();

  if (time < LOCK_PART1_DATE.getTime()) {
    return 'pre_tournament';
  } else if (time >= LOCK_PART1_DATE.getTime() && time <= END_GROUPS_DATE.getTime()) {
    return 'group_stage';
  } else if (time > END_GROUPS_DATE.getTime() && time <= END_TOURNAMENT_DATE.getTime()) {
    return 'knockouts';
  } else {
    return 'finished';
  }
}

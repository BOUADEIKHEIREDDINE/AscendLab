/**
 * One call for the app (see docs/Technical/Program generation.md, "Whole plan"): the training days,
 * each day's session with its warm-up, the cardio, the daily steps and every notice, for a week.
 */
import { activityTargets } from '../goal-engine/activity';
import type { Goal } from '../goal-engine/targets';
import { planCardio, type CardioDay, type CardioNotice } from './cardio';
import { estimatedMinutes, type ProgramDay, type ProgramNotice } from './program';
import { planSchedule, weekPreview, type PlanState, type ScheduleInput, type ScheduleNotice, type Weekday } from './schedule';
import { warmUpMinutes } from './warm-up';

export type PlanNotice = ProgramNotice | ScheduleNotice | CardioNotice;

export type Profile = {
  goal: Goal;
  age: number;
  /** Weekly cardio the user chose (150-300). Defaults to the goal's target. */
  cardioMinPerWeek?: number;
};

export type PlanDay = {
  weekday: Weekday;
  /** The lifting session, or null on a rest day. */
  session: ProgramDay | null;
  cardio: CardioDay[];
  /** Estimates. The warm-up is optional, so it is kept apart. */
  minutes: { warmUp: number; lifting: number; cardio: number };
};

export type WeekPlan = {
  /** Monday to Sunday. */
  days: PlanDay[];
  /** The same target every day, counted all day. */
  stepsPerDay: number;
  cardioMinPerWeek: number;
  /** Planned lifting this week, for the calories (`liftingKcalPerDay`). */
  liftingMinutesPerWeek: number;
  notices: PlanNotice[];
};

const WEEKDAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

/** The coming week of a plan, after `state.sessionsDone` sessions. */
export function buildWeek({ schedule, sessionsDone }: PlanState, { goal, age, cardioMinPerWeek }: Profile): WeekPlan {
  const targets = activityTargets({ goal, age });
  const week = weekPreview(schedule, sessionsDone);
  const cardio = planCardio({ goal, week, minutesPerWeek: cardioMinPerWeek ?? targets.cardioMinPerWeek });
  const days = WEEKDAYS.map((weekday): PlanDay => {
    const session = week.find((w) => w.weekday === weekday)?.day ?? null;
    const dayCardio = cardio.days.filter((c) => c.weekday === weekday);
    return {
      weekday,
      session,
      cardio: dayCardio,
      minutes: {
        warmUp: session ? warmUpMinutes(session) : 0,
        lifting: session ? estimatedMinutes(session) : 0,
        cardio: dayCardio.reduce((total, c) => total + c.minutes, 0),
      },
    };
  });
  return {
    days,
    stepsPerDay: targets.stepsPerDay,
    cardioMinPerWeek: cardio.minutesPerWeek,
    liftingMinutesPerWeek: days.reduce((total, d) => total + d.minutes.lifting, 0),
    notices: [...schedule.program.notices, ...schedule.notices, ...cardio.notices],
  };
}

/** A new plan from the onboarding answers: the state to store, and the first week. */
export function buildPlan(input: ScheduleInput & Profile): { state: PlanState; week: WeekPlan } {
  const { goal, age, cardioMinPerWeek, ...scheduleInput } = input;
  const state: PlanState = { schedule: planSchedule(scheduleInput), sessionsDone: 0 };
  return { state, week: buildWeek(state, { goal, age, cardioMinPerWeek }) };
}

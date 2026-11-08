/**
 * Every page in the app and its parameters. Pages below a tab are registered in every
 * tab's stack, so opening e.g. Comments from Profile pushes it on the Profile tab, just
 * like the Android app's single back stack did.
 */
import { NavigatorScreenParams, RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MealType } from '../data/social';

export type TabPages = {
  // Home tab (Home and Feed are the same page)
  Home: undefined;
  CreatePost: { type?: MealType } | undefined;
  Friends: undefined;
  Comments: { postId: string };
  Compare: undefined;
  // Train tab
  TrainingPlan: undefined;
  Programs: undefined;
  RoutineEditor: { programId: string; routineId: string | null };
  WorkoutDetail: { workoutId: string };
  ExerciseDetail: { exerciseId: string; name: string };
  Statistics: undefined;
  ExerciseLibrary: undefined;
  Calendar: undefined;
  // Food tab
  CalorieTracker: undefined;
  NutritionPlanner: undefined;
  // Profile tab
  Profile: undefined;
  Settings: undefined;
  EditGoals: undefined;
};

export type Tabs = {
  HomeTab: NavigatorScreenParams<TabPages>;
  TrainTab: NavigatorScreenParams<TabPages>;
  FoodTab: NavigatorScreenParams<TabPages>;
  ProfileTab: NavigatorScreenParams<TabPages>;
};

export type RootPages = {
  // Onboarding (shown once)
  Welcome: undefined;
  SignUp: { logIn?: boolean } | undefined;
  ChooseVersion: undefined;
  YourBody: undefined;
  YourGoals: undefined;
  PlanReady: undefined;
  // The app itself
  Main: NavigatorScreenParams<Tabs> | undefined;
  // Full-screen pages without the tab bar
  WorkoutSession: undefined;
  Story: { uid: string };
  // Reachable from the workout session
  ExerciseDetail: { exerciseId: string; name: string };
  WorkoutDetail: { workoutId: string };
};

export type AllPages = RootPages & TabPages;
export type Nav = NativeStackNavigationProp<AllPages>;

export const useNav = () => useNavigation<Nav>();
export function useParams<K extends keyof AllPages>(): NonNullable<AllPages[K]> {
  return (useRoute<RouteProp<AllPages, K>>().params ?? {}) as NonNullable<AllPages[K]>;
}

/** Leaves onboarding for good and lands on Home, clearing everything before it. */
export function finishOnboarding(nav: Nav) {
  nav.reset({ index: 0, routes: [{ name: 'Main' }] });
}

/** Goes back, or to the start page when there is nothing behind (e.g. after a reload on web). */
export function goBack(nav: Nav) {
  if (nav.canGoBack()) nav.goBack();
}

/** Root stack (onboarding, the tabs, full-screen pages) and the four tab stacks. */
import React, { ComponentType } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator, NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { palette } from '../ui/theme';
import { IconName } from '../ui/components/core';
import { TabDock } from '../ui/components/dock';
import { RootPages, TabPages, Tabs } from './types';
import { StartPage } from '../state/session';
import { WelcomeScreen } from '../ui/screens/onboarding/WelcomeScreen';
import { SignUpScreen } from '../ui/screens/onboarding/SignUpScreen';
import { ChooseVersionScreen } from '../ui/screens/onboarding/ChooseVersionScreen';
import { YourBodyScreen } from '../ui/screens/onboarding/YourBodyScreen';
import { YourGoalsScreen } from '../ui/screens/onboarding/YourGoalsScreen';
import { PlanReadyScreen } from '../ui/screens/onboarding/PlanReadyScreen';
import { PlanRoutineScreen } from '../ui/screens/onboarding/PlanRoutineScreen';
import { HomeScreen } from '../ui/screens/home/HomeScreen';
import { CreatePostScreen } from '../ui/screens/home/CreatePostScreen';
import { FriendsScreen } from '../ui/screens/home/FriendsScreen';
import { EditDayScreen } from '../ui/screens/home/EditDayScreen';
import { PlanDayScreen } from '../ui/screens/home/PlanDayScreen';
import { CommentsScreen } from '../ui/screens/home/CommentsScreen';
import { CompareScreen } from '../ui/screens/home/CompareScreen';
import { StoryScreen } from '../ui/screens/home/StoryScreen';
import { TrainingPlanScreen } from '../ui/screens/train/TrainingPlanScreen';
import { ProgramsScreen } from '../ui/screens/train/ProgramsScreen';
import { RoutineEditorScreen } from '../ui/screens/train/RoutineEditorScreen';
import { RoutineDetailScreen } from '../ui/screens/train/RoutineDetailScreen';
import { WorkoutSessionScreen } from '../ui/screens/train/WorkoutSessionScreen';
import {
  CalendarScreen, ExerciseDetailScreen, ExerciseLibraryScreen, StatisticsScreen, WorkoutDetailScreen,
} from '../ui/screens/train/ProgressScreens';
import { CalorieTrackerScreen } from '../ui/screens/food/CalorieTrackerScreen';
import { NutritionPlannerScreen } from '../ui/screens/food/NutritionPlannerScreen';
import { RecipeDetailScreen, RecipesScreen } from '../ui/screens/food/RecipesScreen';
import { ProfileScreen } from '../ui/screens/profile/ProfileScreen';
import { SettingsScreen } from '../ui/screens/profile/SettingsScreen';
import { EditGoalsScreen } from '../ui/screens/profile/EditGoalsScreen';
import { EditTargetsScreen } from '../ui/screens/profile/EditTargetsScreen';

const screenOptions: NativeStackNavigationOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: palette.ink },
  // Pages slide in from the right when moving forward and back out when returning.
  animation: 'slide_from_right',
};

/** Every page below a tab, so any of them can open on whichever tab you're in. */
const TAB_PAGES: Record<keyof TabPages, ComponentType> = {
  Home: HomeScreen,
  CreatePost: CreatePostScreen,
  Friends: FriendsScreen,
  EditDay: EditDayScreen,
  PlanDay: PlanDayScreen,
  Comments: CommentsScreen,
  Compare: CompareScreen,
  TrainingPlan: TrainingPlanScreen,
  Programs: ProgramsScreen,
  RoutineEditor: RoutineEditorScreen,
  RoutineDetail: RoutineDetailScreen,
  WorkoutDetail: WorkoutDetailScreen,
  ExerciseDetail: ExerciseDetailScreen,
  Statistics: StatisticsScreen,
  ExerciseLibrary: ExerciseLibraryScreen,
  Calendar: CalendarScreen,
  CalorieTracker: CalorieTrackerScreen,
  NutritionPlanner: NutritionPlannerScreen,
  Recipes: RecipesScreen,
  RecipeDetail: RecipeDetailScreen,
  Profile: ProfileScreen,
  Settings: SettingsScreen,
  EditGoals: EditGoalsScreen,
  EditTargets: EditTargetsScreen,
};

function makeTabStack(initial: keyof TabPages) {
  const Stack = createNativeStackNavigator<TabPages>();
  return function TabStack() {
    return (
      <Stack.Navigator initialRouteName={initial} screenOptions={screenOptions}>
        {(Object.keys(TAB_PAGES) as (keyof TabPages)[]).map((name) => (
          <Stack.Screen key={name} name={name} component={TAB_PAGES[name]} />
        ))}
      </Stack.Navigator>
    );
  };
}

const HomeStack = makeTabStack('Home');
const TrainStack = makeTabStack('TrainingPlan');
const FoodStack = makeTabStack('CalorieTracker');
const ProfileStack = makeTabStack('Profile');

const Tab = createBottomTabNavigator<Tabs>();
const TAB_INFO: { name: keyof Tabs; label: string; icon: IconName; component: ComponentType }[] = [
  { name: 'HomeTab', label: 'Home', icon: 'home', component: HomeStack },
  { name: 'TrainTab', label: 'Train', icon: 'fitness-center', component: TrainStack },
  { name: 'FoodTab', label: 'Food', icon: 'restaurant', component: FoodStack },
  { name: 'ProfileTab', label: 'Profile', icon: 'person', component: ProfileStack },
];

function MainTabs() {
  return (
    <Tab.Navigator
      // The floating dock replaces the default tab bar (it also hosts the workout mini player).
      tabBar={(props) => <TabDock {...props} tabs={TAB_INFO.map(({ name, label, icon }) => ({ name, label, icon }))} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: palette.ink } }}
    >
      {TAB_INFO.map((t) => (
        <Tab.Screen key={t.name} name={t.name} component={t.component} options={{ tabBarLabel: t.label, tabBarAccessibilityLabel: t.label }} />
      ))}
    </Tab.Navigator>
  );
}

const Root = createNativeStackNavigator<RootPages>();

export function AppNavigator({ start }: { start: StartPage }) {
  return (
    <Root.Navigator initialRouteName={start} screenOptions={screenOptions}>
      <Root.Screen name="Welcome" component={WelcomeScreen} options={{ animation: 'fade' }} />
      <Root.Screen name="SignUp" component={SignUpScreen} />
      <Root.Screen name="ChooseVersion" component={ChooseVersionScreen} />
      <Root.Screen name="YourBody" component={YourBodyScreen} />
      <Root.Screen name="YourGoals" component={YourGoalsScreen} />
      <Root.Screen name="PlanReady" component={PlanReadyScreen} />
      <Root.Screen name="PlanRoutine" component={PlanRoutineScreen} />
      <Root.Screen name="Main" component={MainTabs} options={{ animation: 'fade' }} />
      {/* The live workout takes the whole screen, like a dedicated training mode. */}
      <Root.Screen name="WorkoutSession" component={WorkoutSessionScreen} options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
      <Root.Screen name="Story" component={StoryScreen} options={{ animation: 'fade', contentStyle: { backgroundColor: palette.overlayBackground } }} />
      <Root.Screen name="ExerciseDetail" component={ExerciseDetailScreen} />
      <Root.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
    </Root.Navigator>
  );
}

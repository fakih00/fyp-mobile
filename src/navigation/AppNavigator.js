import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import {
    SplashScreen,
    OnboardingScreen,
    LoginScreen,
    SignupScreen,
    GenderSelectScreen,
    BiometricScreen,
    GoalScreen,
    LifestyleScreen,
    ActivityScreen,
    ShopScreen,
    ChatScreen,
    AIChatScreen,
    WorkoutPlayerScreen,
    ChallengesScreen,
    ProfileScreen,
    ProgressScreen,
    NutritionPlanScreen,
    SmartMealAIScreen,
    MealReviewScreen,
    MessagesScreen,
    AchievementsScreen,
    NotificationsScreen,
    FindFriendsScreen,
    EditProfileScreen,
    NotificationsSettingsScreen,
    PrivacyScreen,
    EliteSubscriptionScreen,
    MyFriendsScreen,
    MyClubsScreen,
    TrainingPreferenceScreen,
    DietaryPreferenceScreen,
    PhysicalAssessmentScreen,
    NutritionLogScreen,
    WaterLogScreen,
    GeneratingPlanScreen,
    BodyRecoveryScreen,
    InjuryWarningScreen,
    CompetitionPrepScreen
} from '../screens';
import TabNavigator from './TabNavigator';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
    return (
        <NavigationContainer>
            <StatusBar style="dark" />
            <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Splash">
                <Stack.Screen name="Splash" component={SplashScreen} />
                <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Signup" component={SignupScreen} />
                <Stack.Screen name="GenderSelect" component={GenderSelectScreen} />
                <Stack.Screen name="Biometric" component={BiometricScreen} />
                <Stack.Screen name="Goal" component={GoalScreen} />
                <Stack.Screen name="Lifestyle" component={LifestyleScreen} />
                <Stack.Screen name="TrainingPreference" component={TrainingPreferenceScreen} />
                <Stack.Screen name="PhysicalAssessment" component={PhysicalAssessmentScreen} />
                <Stack.Screen name="DietaryPreference" component={DietaryPreferenceScreen} />
                <Stack.Screen name="Activity" component={ActivityScreen} />
                <Stack.Screen name="GeneratingPlan" component={GeneratingPlanScreen} />
                <Stack.Screen name="InjuryWarning" component={InjuryWarningScreen} />
                <Stack.Screen name="Main" component={TabNavigator} />
                <Stack.Screen name="Shop" component={ShopScreen} />
                <Stack.Screen name="Chat" component={ChatScreen} />
                <Stack.Screen name="WorkoutPlayer" component={WorkoutPlayerScreen} />
                <Stack.Screen name="Challenges" component={ChallengesScreen} />
                <Stack.Screen name="Profile" component={ProfileScreen} />
                <Stack.Screen name="Progress" component={ProgressScreen} />
                <Stack.Screen name="NutritionPlan" component={NutritionPlanScreen} />
                <Stack.Screen name="SmartMealAI" component={SmartMealAIScreen} />
                <Stack.Screen name="MealReview" component={MealReviewScreen} />
                <Stack.Screen name="NutritionLog" component={NutritionLogScreen} />
                <Stack.Screen name="WaterLog" component={WaterLogScreen} />
                <Stack.Screen name="Messages" component={MessagesScreen} />
                <Stack.Screen name="Achievements" component={AchievementsScreen} />
                <Stack.Screen name="Notifications" component={NotificationsScreen} />
                <Stack.Screen name="FindFriends" component={FindFriendsScreen} />
                <Stack.Screen name="EditProfile" component={EditProfileScreen} />
                <Stack.Screen name="NotificationsSettings" component={NotificationsSettingsScreen} />
                <Stack.Screen name="Privacy" component={PrivacyScreen} />
                <Stack.Screen name="EliteSubscription" component={EliteSubscriptionScreen} />
                <Stack.Screen name="MyFriends" component={MyFriendsScreen} />
                <Stack.Screen name="MyClubs" component={MyClubsScreen} />
                <Stack.Screen name="BodyRecovery" component={BodyRecoveryScreen} />
                <Stack.Screen name="CompetitionPrep" component={CompetitionPrepScreen} />
                <Stack.Screen
                    name="AIChat"
                    component={AIChatScreen}
                    options={{
                        headerShown: false,
                        presentation: 'modal',
                    }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default AppNavigator;

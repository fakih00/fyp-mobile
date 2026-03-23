import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { COLORS } from '../constants/Theme';
import { AnimatedTabBar } from '../components';

import {
    HomeScreen,
    WorkoutPlanScreen,
    NutritionPlanScreen,
    LeaderboardScreen,
    SocialScreen
} from '../screens';

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
    return (
        <Tab.Navigator
            tabBar={(props) => <AnimatedTabBar {...props} />}
            screenOptions={{
                headerShown: false,
            }}
        >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Workout" component={WorkoutPlanScreen} />
            <Tab.Screen name="Nutrition" component={NutritionPlanScreen} />
            <Tab.Screen name="Leaderboard" component={LeaderboardScreen} />
            <Tab.Screen name="Social" component={SocialScreen} />
        </Tab.Navigator>
    );
};

export default TabNavigator;

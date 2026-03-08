import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import CivicTabBar from '../components/v2/CivicTabBar';
import HomeDashboardScreen from '../screens/v2/HomeDashboardScreen';
import MyAreaScreen from '../screens/v2/MyAreaScreen';
import CandidatesScreen from '../screens/v2/CandidatesScreen';
import LearnHubScreen from '../screens/v2/LearnHubScreen';
import NewsScreen from '../screens/v2/NewsScreen';

const Tab = createBottomTabNavigator();

export default function HomeRouter() {
    return (
        <Tab.Navigator
            initialRouteName='Home'
            screenOptions={{
                headerShown: false,
                autoHideHomeIndicator: true,
            }}
            tabBar={(props) => <CivicTabBar {...props} />}
        >
            <Tab.Screen name="Home" component={HomeDashboardScreen} />
            <Tab.Screen name="My Area" component={MyAreaScreen} />
            <Tab.Screen
                name="Candidates"
                component={CandidatesScreen}
                options={{ tabBarLabel: "Candidates" }}
            />
            <Tab.Screen name="Learn" component={LearnHubScreen} />
            <Tab.Screen name="News" component={NewsScreen} />

        </Tab.Navigator>
    );
}

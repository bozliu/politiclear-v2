import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import HomeRouter from "./HomeRouter";
import CandidateDetailScreen from "../screens/v2/CandidateDetailScreen";
import CompareScreen from "../screens/v2/CompareScreen";
import ConstituencyExplorerScreen from "../screens/v2/ConstituencyExplorerScreen";
import PublicInfoScreen from "../screens/v2/PublicInfoScreen";

const Stack = createStackNavigator();

export default function RootRouter() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          cardStyle: { flex: 1 },
          headerShown: false,
        }}
      >
        <Stack.Screen name="HomeTabs" component={HomeRouter} />
        <Stack.Screen name="CandidateDetail" component={CandidateDetailScreen} />
        <Stack.Screen name="CandidateCompare" component={CompareScreen} />
        <Stack.Screen name="ConstituencyExplorer" component={ConstituencyExplorerScreen} />
        <Stack.Screen name="PublicInfo" component={PublicInfoScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

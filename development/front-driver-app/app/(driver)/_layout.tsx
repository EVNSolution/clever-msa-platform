import { Tabs } from "expo-router";

export default function DriverTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#181818",
        tabBarInactiveTintColor: "#6f7785",
      }}
    >
      <Tabs.Screen
        name="work-logs"
        options={{
          title: "업무기록",
        }}
      />
      <Tabs.Screen
        name="my"
        options={{
          title: "MY",
        }}
      />
    </Tabs>
  );
}

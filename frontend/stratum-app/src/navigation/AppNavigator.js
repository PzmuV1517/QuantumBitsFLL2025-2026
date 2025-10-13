import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';

// Auth Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

// Main Screens
import ProjectsScreen from '../screens/ProjectsScreen';
import CreateProjectScreen from '../screens/CreateProjectScreen';
import ProjectDetailScreen from '../screens/ProjectDetailScreen';
import CreateNoteScreen from '../screens/CreateNoteScreen';

const Stack = createStackNavigator();

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

const MainStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="Projects"
      component={ProjectsScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="CreateProject"
      component={CreateProjectScreen}
      options={{ title: 'Create Project' }}
    />
    <Stack.Screen
      name="ProjectDetail"
      component={ProjectDetailScreen}
      options={{ title: 'Project Details' }}
    />
    <Stack.Screen
      name="CreateNote"
      component={CreateNoteScreen}
      options={{ title: 'Create Note' }}
    />
  </Stack.Navigator>
);

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // Or a loading screen
  }

  return (
    <NavigationContainer>
      {user ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

import Constants from 'expo-constants';

export const config = {
  apiBaseUrl: Constants.expoConfig?.extra?.apiBaseUrl || 'http://localhost:8000/api',
  firebase: {
    apiKey: Constants.expoConfig?.extra?.firebaseApiKey,
    authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain,
    projectId: Constants.expoConfig?.extra?.firebaseProjectId,
    storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket,
    messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId,
    appId: Constants.expoConfig?.extra?.firebaseAppId,
  },
  app: {
    name: 'STRATUM',
    version: '1.0.0',
  },
};

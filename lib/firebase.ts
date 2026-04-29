import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBHtZdxGZPUm-hQWHIRfWMLdimZ3z1jW7Q",
  authDomain: "medtrack-d50d2.firebaseapp.com",
  projectId: "medtrack-d50d2",
  storageBucket: "medtrack-d50d2.firebasestorage.app",
  messagingSenderId: "64585283971",
  appId: "1:64585283971:web:352d1ae36555d36778deb6",
  measurementId: "G-5Z2DJSVKBV"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = (() => {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
})();
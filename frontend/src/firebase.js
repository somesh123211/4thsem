import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCiCpjhFZhSfiLxO8ph4dv6ZHtSwW-IQc8",
  authDomain: "timetable-system-ee069.firebaseapp.com",
  projectId: "timetable-system-ee069",
  storageBucket: "timetable-system-ee069.firebasestorage.app",
  messagingSenderId: "101409529882",
  appId: "1:101409529882:web:c4dba80f056f01595b31a3"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
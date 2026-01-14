import { initializeApp } from 'firebase/app'

export const firebaseApp = initializeApp({
  databaseURL: import.meta.env.VITE_DB_URL,
})
// // app/index.js
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/(tabs)" />;
}

// import { Redirect } from "expo-router";

// export default function AuthIndex() {
//   return <Redirect href="/auth/sign-in" />;
// }

// app/auth/_layout.js
// import { Stack } from "expo-router";

// export default function AuthLayout() {
//   return <Stack screenOptions={{ headerShown: false }} />;
// }
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import { useColorScheme } from 'react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../tamagui.config'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const scheme = useColorScheme()
  const [loaded] = useFonts({
    Inter: require('../assets/fonts/Inter-Regular.ttf'),
    InterSemiBold: require('../assets/fonts/Inter-SemiBold.ttf'),
    Fraunces: require('../assets/fonts/Fraunces-SemiBold.ttf'),
  })

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync()
  }, [loaded])

  if (!loaded) return null

  return (
    <TamaguiProvider config={config} defaultTheme={scheme === 'dark' ? 'dark' : 'light'}>
      <Stack screenOptions={{ headerShown: false }} />
    </TamaguiProvider>
  )
}

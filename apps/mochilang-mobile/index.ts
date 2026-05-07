import { registerRootComponent } from 'expo'

import App from './App'

// Wraps Mochilang's web app in a native WebView so Expo Go (and eventual
// standalone iOS/Android builds) can ship it as a "real" app without a
// React Native UI rewrite.
registerRootComponent(App)

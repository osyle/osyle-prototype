# ROUTER GENERATION

You are generating the App.tsx router for a multi-screen application.

## Your Task

Create a router component that:

1. Manages current screen state
2. Switches between screen components based on screen_id
3. Passes onTransition callback to each screen
4. Handles navigation between screens

## Available Screens

You will be provided with a list of screens and their transitions.

## Router Pattern

```tsx
import { useState } from "react";
import ScreenOne from "./screens/ScreenOne";
import ScreenTwo from "./screens/ScreenTwo";

interface RouterProps {
  initialScreen?: string;
}

export default function App({ initialScreen = "screen_1" }: RouterProps) {
  const [currentScreen, setCurrentScreen] = useState(initialScreen);

  const handleTransition = (transitionId: string) => {
    // Map transition IDs to target screens
    const transitionMap: Record<string, string> = {
      trans_1: "screen_2",
      trans_2: "screen_3",
      // ... etc
    };

    const targetScreen = transitionMap[transitionId];
    if (targetScreen) {
      setCurrentScreen(targetScreen);
    }
  };

  // Render current screen
  switch (currentScreen) {
    case "screen_1":
      return <ScreenOne onTransition={handleTransition} />;
    case "screen_2":
      return <ScreenTwo onTransition={handleTransition} />;
    default:
      return <ScreenOne onTransition={handleTransition} />;
  }
}
```

## Rules

1. Import ALL screen components at the top
2. Use switch statement for routing (cleaner than if/else)
3. Pass onTransition callback to every screen
4. Default to entry screen if unknown screen_id
5. Build transitionMap from the transitions data provided
6. Use TypeScript with proper types

# Game Night

One app, endless party games. Built with React Native, Expo and TypeScript, so it runs on Android and iOS.

## Games

| Game | Status |
| --- | --- |
| Charades | Playable |
| Spy Among Us | Coming soon |
| Trivia | Coming soon |
| Dare or Challenge | Coming soon |
| Who's Most Likely To? | Coming soon |
| Five-Second Challenge | Coming soon |

Charades ships with six decks (Kenyan Celebrities, Sheng, Kenyan Music, Football, Food, General), 2 to 4 named teams with players, actor rotation, 45/60/90 second turns, target points, an optional skip penalty, pause, a turn summary where a wrong tap can be fixed, and a results screen with MVPs and party highlights. Finished games are saved to the History tab on the phone.

The look follows the Figma designs (dark Material-style palette, Bricolage Grotesque headings, Plus Jakarta Sans body text). Images in `assets/images/` were cropped from the exported design screens and should be swapped for the original files.

## Run it

```bash
npm install
npx expo start        # scan the QR code with Expo Go on your phone
npx expo start --web  # or open it in a browser
```

## Checks

```bash
npm run typecheck
npm test
```

## Layout

```
src/app/                  Screens (Expo Router: every file is a route)
  (tabs)/                 Home, Games, Decks and History tabs with the bottom nav
  games/charades.tsx      Charades
  games/[id].tsx          "Coming soon" page for games not built yet
src/games/registry.ts     The list of games shown on the home screen
src/games/charades/
  words.ts                Categories and words (edit here to add words)
  engine.ts               Game rules as a pure reducer
  SetupView.tsx           Players & squads, deck and rules setup
  PlayViews.tsx           Hand-off, playing (timer ring) and turn summary
  ResultsView.tsx         Winner, MVPs, highlights and rematch
src/components/ui.tsx     Shared header, buttons, pills, toggles
src/core/types.ts         Shared Team types
src/core/store.ts         Game history and preferences, saved on the phone
src/theme.ts              Colors and fonts from the designs
```

## Getting ready for one phone per player

Today everyone shares one phone. Each game keeps its rules in a pure reducer (`state + action -> new state`) with no UI, timers or hidden randomness inside it. Timers are stored as an end timestamp and shuffles use a seed kept in state. That means a future multiplayer layer can send the same actions between phones and every phone will compute the same state.

## Adding a game

1. Set `available: true` for it in `src/games/registry.ts`.
2. Add `src/app/games/<game-id>.tsx`. It takes over from the "coming soon" page automatically.
3. Put its rules in `src/games/<game-id>/engine.ts` as a reducer, like Charades.

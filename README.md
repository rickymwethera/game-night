# Game Night

One app, endless party games. Built with React Native, Expo and TypeScript, so it runs on Android and iOS.

## Games

| Game | Status |
| --- | --- |
| Charades | Playable |
| Spy Among Us | Playable |
| Trivia | Playable |
| Dare or Challenge | Coming soon |
| Who's Most Likely To? | Coming soon |
| Five-Second Challenge | Coming soon |
| Guess the Flag | Playable |

Guess the Flag has all 197 flags bundled in the app, so it works offline: the 193 UN member states plus the Vatican City, Palestine, Kosovo and Taiwan. Play the whole world or one continent, solo or with up to four teams passing the phone. Each flag has four choices from the same continent, with an optional 10 or 15 second timer. Flag images come from [flag-icons](https://github.com/lipis/flag-icons) (MIT license, copy in `assets/flags/LICENSE-flag-icons.txt`).

Trivia has 180 questions in six packs: Kenyan Culture, Kenyan Music, Football, Geography, General Knowledge and Pop Culture. Pick any mix of packs and play solo or with up to four teams passing the phone. Each question has four choices; a right answer scores 100 points plus up to 50 more for speed when the 10 or 20 second timer is on. Every team's final score goes on a leaderboard saved on the phone, so it works offline with no account.

Charades ships with six decks (Kenyan Celebrities, Sheng, Kenyan Music, Football, Food, General), 2 to 4 named teams with players, actor rotation, 45/60/90 second turns, target points, an optional skip penalty, pause, a turn summary where a wrong tap can be fixed, and a results screen with MVPs and party highlights. Finished games are saved to the History tab on the phone.

Spy Among Us is pass-the-phone for 3 to 10 players. Each player peeks at the secret word in turn, except the spy, who only sees which pack it comes from (the hint can be switched off). After a timed discussion, players vote by secret ballot or by pointing together; a tie goes to one runoff, and a second tie lets the spy escape. A caught spy gets one guess at the word from eight options to steal the round, and the spy can also own up mid-discussion to guess early. It ships with eight word packs: Kenyan Places, Kenyan Eats, Everyday Kenya, Music & Sport KE, Places, Food & Drink, Animals and Jobs.

The look follows the Figma designs (dark Material-style palette, Bricolage Grotesque headings, Plus Jakarta Sans body text). Images in `assets/images/` were cropped from the exported design screens and should be swapped for the original files.

## Run it

```bash
npm install
npx expo start        # scan the QR code with Expo Go on your phone
npx expo start --web  # or open it in a browser
```

## Accounts (optional)

Playing never needs an account. The header's profile button opens **Profile & Settings**, where anyone can set a display name and avatar (saved on the phone), switch buzz & haptics and 18+ decks, and clear game history. An account backs up the name and avatar with [Supabase](https://supabase.com) so they follow the player to another phone, and can be deleted from the same screen.

Accounts stay switched off until the app has Supabase keys. To turn them on:

1. Create a free project at supabase.com.
2. In the project's **SQL Editor**, run `supabase/migrations/20261010000000_accounts.sql`. It creates the `profiles` table (each player can only read and edit their own row) and the `delete_account` function used by "Delete account".
3. Copy `.env.example` to `.env.local` and fill in the project URL and publishable key from **Project Settings > API Keys**.
4. Restart `npx expo start`.

New Supabase projects ask people to confirm their email before the first sign-in; the app tells them to check their inbox. You can turn that off under **Authentication > Sign In / Providers > Email**.

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
  games/spy-among-us.tsx  Spy Among Us
  games/trivia.tsx        Trivia
  games/[id].tsx          "Coming soon" page for games not built yet
src/games/registry.ts     The list of games shown on the home screen
src/games/charades/
  words.ts                Categories and words (edit here to add words)
  engine.ts               Game rules as a pure reducer
  SetupView.tsx           Players & squads, deck and rules setup
  PlayViews.tsx           Hand-off, playing (timer ring) and turn summary
  ResultsView.tsx         Winner, MVPs, highlights and rematch
src/games/spy-among-us/
  words.ts                Word packs (edit here to add words or packs)
  engine.ts               Game rules as a pure reducer
  SetupView.tsx           Players, word packs and rules setup
  PlayViews.tsx           Peek, discussion, voting, verdict, spy's guess and round result
  ResultsView.tsx         Final standings and spy files
src/games/trivia/
  packs/                  One file per question pack (edit here to add questions or packs)
  engine.ts               Game rules, scoring and leaderboard ranking as pure functions
  leaderboard.ts          Leaderboard saved on the phone
  SetupView.tsx           Packs, teams, rules and leaderboard
  PlayViews.tsx           Hand-off, question and turn summary
  ResultsView.tsx         Winner, answers to remember and leaderboard
src/components/ui.tsx     Shared header, buttons, pills, toggles
src/core/types.ts         Shared Team types
src/core/store.ts         Game history, profile and preferences, saved on the phone
src/core/account.ts       Optional accounts: sign up, sign in, profile sync, delete
src/core/supabase.ts      Supabase client (null when no keys are set)
src/app/profile.tsx       Profile & Settings
src/app/sign-in.tsx       Create account / sign in
supabase/migrations/      Database setup for accounts
src/theme.ts              Colors and fonts from the designs
```

## Getting ready for one phone per player

Today everyone shares one phone. Each game keeps its rules in a pure reducer (`state + action -> new state`) with no UI, timers or hidden randomness inside it. Timers are stored as an end timestamp and shuffles use a seed kept in state. That means a future multiplayer layer can send the same actions between phones and every phone will compute the same state.

## Adding a game

1. Set `available: true` for it in `src/games/registry.ts`.
2. Add `src/app/games/<game-id>.tsx`. It takes over from the "coming soon" page automatically.
3. Put its rules in `src/games/<game-id>/engine.ts` as a reducer, like Charades.

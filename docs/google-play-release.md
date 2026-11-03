# Releasing Game Night on Google Play

Everything here is done once for the first release, except step 9, which you repeat for every update. Budget about three weeks end to end: a few days for Google to verify your account, then 14 days of closed testing, then up to a week of review.

The app is already set up for this in the repo:

| What | Where |
| --- | --- |
| Android package name: `com.rickymwethera.gamenight` | `app.json` |
| App icon, adaptive icon, themed icon, splash screen | `assets/` |
| Build profiles: `preview` (APK to test on your phone) and `production` (AAB for Play) | `eas.json` |
| Store icon (512×512), feature graphic (1024×500), 5 phone screenshots | `docs/play-store/` |
| Privacy policy, including how to delete an account | `docs/privacy-policy.md` |

> **The package name is permanent.** Once the first build is uploaded to Play it can never change. If you want something else (for example your company's domain), change `android.package` in `app.json` before step 4.

## 1. Create a Google Play developer account ($25, once)

1. Go to <https://play.google.com/console/signup> and sign in with the Google account you want to own the app.
2. Choose **Yourself** (a personal account). An organisation account needs a D-U-N-S number; you can switch later.
3. Pay the $25 one-time fee.
4. Verify your identity with a government ID, verify your phone number, and verify that you own an Android phone (Google asks you to install the Play Console app and sign in on it). Verification can take a few days.

Personal accounts show your legal name and country as the developer on the store page. The contact email you give is shown publicly too, so consider a dedicated address such as a new Gmail for Game Night.

## 2. Set up Expo (EAS) on your computer

You need Node.js installed. In the project folder:

```bash
npm install
npx eas-cli@latest login     # create a free account at expo.dev first if you don't have one
npx eas-cli@latest init      # links the app to your Expo account
```

`init` adds `extra.eas.projectId` (and `owner`) to `app.json`. Commit that change.

### Optional: turn on accounts and TV mode in the store build

`.env.local` is not uploaded to EAS, so a cloud build has no Supabase keys and ships with accounts and TV mode switched off (every game still works). To turn them on, add the same values as EAS environment variables:

```bash
npx eas-cli@latest env:create --environment production --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value "https://xxxx.supabase.co" --visibility plaintext
npx eas-cli@latest env:create --environment production --environment preview --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value "sb_publishable_..." --visibility plaintext
npx eas-cli@latest env:create --environment production --environment preview --name EXPO_PUBLIC_TV_URL --value "https://your-site/tv" --visibility plaintext
```

Whether accounts are on changes your answers in step 6 (data safety and account deletion), so decide before then.

## 3. Test on your own phone first

```bash
npx eas-cli@latest build --platform android --profile preview
```

When it finishes, EAS shows a QR code and link. Open it on your Android phone to install the APK. Check the icon, the splash screen and a round of each game.

The first time you build, EAS asks to generate an Android keystore. Say **yes**: EAS keeps it safe for you, and every later build is signed with it.

## 4. Build the Play Store version

```bash
npx eas-cli@latest build --platform android --profile production
```

This produces an `.aab` file (Android App Bundle), which is what Play needs. Download it from the build page on expo.dev. The build number (`versionCode`) goes up by one automatically on every production build.

## 5. Create the app in Play Console

1. In Play Console, click **Create app**.
2. App name **Game Night**, default language **English (United Kingdom)** or **English (United States)**, **Game**, **Free**.
3. Accept the declarations and click **Create app**.

Free is permanent: a free app can never be changed to paid later (you can still add in-app purchases).

## 6. Fill in "App content" (Policy and programs > App content)

Each item below is a card on that page.

**Privacy policy.** Use the policy in this repo once this branch is merged:
`https://github.com/rickymwethera/game-night/blob/main/docs/privacy-policy.md`
(The repo must stay public for the link to work. If you make it private later, host the page somewhere else, for example on the Expo web build.)

**Ads.** No, the app has no ads.

**App access.** All functionality is available without special access (accounts are optional).

**Content rating.** Start the questionnaire, enter your email, category **Game**. Answer honestly for the app with 18+ cards switched on, because a reviewer can switch them on:
- Violence, fear, gambling, drugs, language: **No**.
- Sexuality: the 18+ cards include flirting and suggestive dares (a "seductive walk", twerking, pickup lines). Answer **Yes** to sexual innuendo / suggestive themes if asked, and **No** to nudity or sexual content.
- Alcohol: a few cards mention bars, clubs and a drunk uncle. Answer **Yes** to references to alcohol if asked, **No** to use or encouragement.
- Users interact or share content online: **No** (everything happens on one phone; TV mode only mirrors the game).
- Expect a rating around Teen / PEGI 12. If you get a higher rating than you expected, nothing breaks; it just limits who sees the app on restricted devices.

**Target audience and content.** Choose **18 and over** for the first release. The 18+ toggle has no age check, and choosing any age group under 13 puts the app under Google's Families policy, which adds extra review. You can add 13–17 later once the app is live.

**Data safety.** Answer according to step 2:
- *Without Supabase keys* (accounts off): the app collects and shares **no data**.
- *With accounts on*: Data is collected: **Yes**. Encrypted in transit: **Yes**. Users can request deletion: **Yes**. Then tick **Personal info > Email address** and **Personal info > Name** (the display name). For each: collected, not shared, optional (users can play without an account), purpose **Account management**. Supabase is a service provider, which does not count as sharing.

**Account deletion** (only asked when accounts are on). Use the policy's deletion section:
`https://github.com/rickymwethera/game-night/blob/main/docs/privacy-policy.md#deleting-your-account-and-data`

**Advertising ID.** No. **Government app, financial features, health, news:** No.

## 7. Store listing (Grow users > Store presence > Main store listing)

- **App name:** Game Night
- **Short description** (80 characters max):
  `Charades, Spy, Trivia, Dares and more. One phone, one group, endless laughs.`
- **Full description:**

  ```
  Game Night is every party game in one app. Pass one phone around and play.

  CHARADES
  Act it out with no talking. Decks for Kenyan celebrities, Sheng, Kenyan music, football, food and general fun. Teams, timer and scores built in.

  SPY AMONG US
  Everyone gets the secret word except the spy. Give clues, ask questions, then vote to catch them before they work it out.

  TRIVIA
  180 questions on Kenyan culture, Kenyan music, football, geography, general knowledge and pop culture. Play in teams and climb the leaderboard.

  DARE OR CHALLENGE
  Spin the wheel for dares, challenges, impressions, performances and group tasks. Clean by default, with optional 18+ cards for grown-up nights.

  5-SECOND CHALLENGE
  Name three things before the timer runs out. Easy to learn, impossible to stop playing.

  GUESS THE FLAG
  All 197 flags of the world, solo or in teams.

  No sign-up needed, no ads, and most games work offline.
  ```

- **App icon:** `docs/play-store/icon-512.png`
- **Feature graphic:** `docs/play-store/feature-graphic.png`
- **Phone screenshots:** `docs/play-store/screenshots/1.png` to `5.png`
- **Category:** Games > **Casual**. Tags: party, trivia, word.
- **Contact details:** an email address (required, shown publicly).

## 8. Closed test: 12 testers for 14 days (required for new personal accounts)

Google won't let a personal account created after November 2023 publish to everyone until the app has been in a closed test with **at least 12 testers opted in for at least 14 days in a row**.

1. **Testing > Closed testing > Create track** (or use the default "Closed testing - Alpha").
2. **Testers:** create an email list and add the Gmail addresses of at least 12 people (aim for 15–20 in case some drop out). Friends and family who play with you are perfect.
3. **Countries/regions:** add Kenya and any others you want.
4. **Create new release**, upload the `.aab` from step 4, add release notes, then **Review release > Start rollout to Closed testing**. Google reviews this first build, which can take a few days.
5. Once approved, copy the **opt-in link** from the Testers tab and send it to everyone. Each tester opens it on their Android phone, taps **Become a tester**, then installs Game Night from the Play Store link on that page.
6. Ask testers to keep it installed and open it a few times. Google looks for real use, and testers who opt out reset the count. Ship at least one update during the 14 days (fix something they report) and keep a short list of what you changed; you'll be asked about it.

The 14 days start when 12 testers have opted in, not when you create the track.

## 9. Apply for production and publish

1. After 14 days, go to **Dashboard** and click **Apply for production**. Answer the questions about your test (how many testers, what feedback you got, what you changed). Google usually replies within 7 days.
2. When approved: **Production > Create new release**, then **Add from library** and pick the build your testers have, or upload a new one.
3. Choose countries (Kenya, plus anywhere else), add release notes, **Review release**, then **Start rollout to Production**.
4. The production release goes through review (usually a few hours to a few days). After that, Game Night is live on Google Play.

## Shipping updates

1. Bump `version` in `app.json` (for example `1.0.0` to `1.1.0`). This is the version people see; the build number goes up on its own.
2. `npx eas-cli@latest build --platform android --profile production`
3. Upload the new `.aab` to Production (or to a testing track first).

### Optional: upload from the command line

After the first manual upload, EAS can send builds to Play for you. In Google Cloud, create a service account with access to your Play Console app and download its JSON key (Expo's guide: <https://docs.expo.dev/submit/android/>). Keep the key out of git. Then:

```bash
npx eas-cli@latest submit --platform android --profile production
```

`eas.json` sends these to the **internal testing** track as a draft, so nothing reaches players until you promote it in Play Console.

## Later: the App Store

`app.json` already has an iOS bundle ID (`com.rickymwethera.gamenight`). When you have the Apple Developer account ($99/year), the same `production` profile builds for iOS with `--platform ios`.

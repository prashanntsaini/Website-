# Next steps

## Upload
1. Upload every file from the zip to your hosting / GitHub (new files: `galti.html`, `galti.js`, `rapid.html`, `stats.js`).
2. Refresh the site twice so the new version (`?v=27`) loads.

## What is new
- **Background uploads:** photos, videos, APKs and any file sent in Messages (and photos/videos/reels posted from Profile) upload in the background. See below.
- **English only:** the whole site is in English. The Hindi language option was removed from Settings.
- **Today card (Dashboard):** daily goal ring, day streak, XP, level, accuracy and a 7-day chart. Tap "Change goal" to cycle 10 / 20 / 30 / 50 / 100 questions.
- **Rapid Fire:** timer bar, sound effects (can be turned off), accuracy and best combo, review of wrong answers, last 5 games, native Share button plus WhatsApp challenge.
- **Mistake Cards:** total / due / mastered counters, progress bar, "Shuffle all cards", and a session counter ("Card 2 of 8").
- Every answer in tests, Rapid Fire and Mistake Cards now adds XP (+5 correct, +1 wrong) and counts towards the daily goal.

## Quick test
- Take a test and answer one question wrong on purpose. Open "Review Mistake Cards" and practise it.
- Play one Rapid Fire game and check the summary, history and share buttons.
- Open the Dashboard: the Today card should show your answers, XP and streak.
- In Reels, a Mistake Card lock appears after 10 reels (on the 11th reel) when a card is due.

## Current limits
- Cards, stats, history and best score are saved only in this browser / phone. On a shared phone everyone shares them.
- Only questions from tests taken after the Mistake Cards update become cards.

## Possible next phase
- Save cards and stats in Firebase per account (needs new Firestore rules).
- "Learn from a friend": a 30-second reel from someone who answered correctly.
- Leaderboard for Rapid Fire (needs server-side checks to prevent cheating).

## Instagram-style sending (v29)
- Send a photo, video, APK or any file in Messages: it appears in the chat **immediately** (photo preview / video thumbnail / file card) with a small "Sending..." line. Once delivered the line disappears and the real message replaces it.
- You can leave the chat, open another chat, or even go to another page. The file is saved on the device (IndexedDB), and the upload **continues on the next page** (`layout.js` resumes it). Nothing is lost.
- If it fails (no internet etc.) the message shows "Not delivered - tap to retry". It also retries by itself when the internet is back.
- Photos / reels posted from Profile are shared the same way: the window closes at once, a small "Posting..." tray with a progress bar shows at the top of every page until it is done.
- Safe against doubles: a retried or resumed upload reuses the same message id and the same uploaded file, so the message is never sent twice, and it keeps its original time in the chat.
- New file: `uploads.js`. Changed: `files.js`, `community.js`, `messages.html`, `profile.html`, `layout.js`, `style.css`.
- Limit: if the browser is fully closed, the upload pauses and continues the next time any page of the site is opened (a website cannot upload with the browser closed). If the browser blocks IndexedDB (private mode), a warning is shown when leaving during an upload.

## Messages upgrade (v30): reel cover, reply, forward, reactions, delete, group chat
**Publish first:** Firebase Console > Firestore > Rules > paste the new `firestore.rules` > Publish. (`storage.rules` is unchanged.) Without the new rules, groups, reactions and reply/forward will say "Not allowed".

- **Reel in a chat:** share a reel to a person or group and it shows as a card: cover picture, owner name, caption, play icon. Tap it to open the reel. New reels save a small cover picture automatically (taken from the video when it is uploaded). Old reels have no saved cover, so the card shows the first frame of the video instead.
- **Message menu:** long-press a message (phone), right-click or the ⋯ button (computer). It has 6 quick reactions, Reply, Forward, Copy, Edit (your own text), Delete, Report.
- **Reply:** also swipe a message sideways. The quoted message shows above your reply, tap it to jump to the original.
- **Reactions:** double-tap a message for a heart. Tap the reaction chip to see who reacted.
- **Forward:** to one or many people and groups. Shows "Forwarded" on the message.
- **Delete for you / Delete for everyone:** "for you" hides it only in your own chat. "for everyone" is the old unsend. Menu > "Delete chat for me" clears a whole chat for you only.
- **Group chats:** people icon at the top of the chat list. Pick 2 or more people, name the group, Create. Group info: rename (admin), add people (admin), remove people / make admin (admin), leave group. Up to 30 people. Notices like "Aman added Ravi" appear in the chat. Photos, videos and files work in groups too.
- Only people who accept your messages (their DM setting) can be added to a group.

**Limits:** a file forwarded from someone else's message is shared, not copied. If the original sender deletes it for everyone, the forwarded copy can show "file not available". Group files are stored in the posts area, so any signed-in student who has the exact file link can open it (links cannot be guessed).

# ❄️ SnowEd — Smart Student Scheduler

> A fully offline Android student productivity app for managing schedules, courses, notes, and research — all in one place, no internet required.

[![Platform](https://img.shields.io/badge/platform-Android-brightgreen.svg)](#)
[![Built With](https://img.shields.io/badge/built%20with-React%20Native%20%2B%20Expo-blue.svg)](https://expo.dev/)
[![Database](https://img.shields.io/badge/database-SQLite-orange.svg)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-active-success.svg)](#)

---

## 📖 Table of Contents

- [About the Project](#-about-the-project)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Installation](#-installation)
- [Project Structure](#-project-structure)
- [Landing Page](#-landing-page)
- [Citations & Acknowledgments](#-citations--acknowledgments)
- [License](#-license)

---

## 🧐 About the Project

**SnowEd** is a free, fully offline Android student scheduler built with React Native and Expo. It was designed out of a simple frustration: most student apps require an internet connection, cost money, or try to do too much. SnowEd works the moment you open it — no login, no subscription, no waiting for a server.

All data is stored locally on-device using SQLite. Schedules, courses, notes, and research are private and yours forever, even without a WiFi connection.

---

## ✨ Key Features

- **🏠 Home** — Daily schedule overview with stats cards (total, done, pending, overdue), next upcoming event, urgent items list, and quick actions.
- **📅 Calendar** — Full monthly grid with color-coded dots per schedule type. Tap any day to view, edit, or complete tasks. Includes a searchable month-schedules view with filter chips and sort options.
- **📚 Courses** — Add subjects with name, code, instructor, room, color, and weekly class slots. View linked schedules per course with completion stats.
- **🔔 Reminders** — Urgent tasks surface automatically with local push notifications. Customizable lead times from 5 minutes to 1 day before the deadline.
- **📝 Notes** — Rich text editor with bold, italic, headings, bullet lists, photo attachments, find-in-note search, and bulk delete. Wikipedia articles can be saved directly as notes.
- **🌐 Research** — Wikipedia search using the free public API. Full articles displayed in collapsible sections, saved to Notes in one tap.
- **🎨 Themes** — 5 color schemes × light/dark mode, persisted across sessions.
- **🫧 Bubble Nav** — Custom floating radial navigation menu using the SnowEd mascot icon, replacing the standard tab bar.

---

## 🛠️ Tech Stack

```
Languages:             TypeScript
Frontend:              Next.js 14 (landing page)
Backend:               None — fully offline, no server
Mobile:                React Native, Expo SDK 57, Expo Router
Database:              SQLite via expo-sqlite (on-device)
Version Control:       Git, GitHub
Cloud & Infrastructure: Vercel (landing page), EAS Build (APK), GitHub Releases (distribution)
```

**Key Packages:**
- `expo-sqlite` — on-device SQLite database
- `expo-notifications` — local push notifications
- `expo-image-picker` — camera and gallery access for Notes
- `react-native-pell-rich-editor` — rich text editor (WebView-based)
- `react-native-safe-area-context` — safe area insets
- `@react-native-async-storage/async-storage` — theme and onboarding persistence
- `@expo/vector-icons` (Ionicons) — icons throughout the app

**External API:**
- [Wikipedia Action API](https://www.mediawiki.org/wiki/API:Main_page) — free, no key required, used in the Research tab

---

## 🚀 Installation

1. Go to the [Releases](https://github.com/rmfsantos0704/nurse-scheduler-app/releases/tag/v1.0.0) page
2. Download the latest `.apk` file
3. Open the file on your Android device
4. Tap **Install** — if prompted, allow installation from unknown sources
5. Open **SnowEd** and you're good to go

**Requirements:** Android 8.0 (Oreo) or higher · No account needed · Works fully offline

---

## 📁 Project Structure

```
nurse-scheduler-app/
├── app/
│   ├── (tabs)/
│   │   ├── home.tsx            # Today's schedule overview
│   │   ├── calendar.tsx        # Monthly calendar
│   │   ├── courses.tsx         # Course management
│   │   ├── reminders.tsx       # Urgent reminders
│   │   ├── notes.tsx           # Notes list
│   │   └── research.tsx        # Wikipedia search
│   ├── note-editor.tsx         # Rich text note editor
│   ├── wiki-article.tsx        # Wikipedia article reader
│   ├── month-schedules.tsx     # Full month schedule list
│   ├── settings.tsx            # Appearance + notifications
│   └── _layout.tsx             # Root layout + DB init
├── src/
│   ├── database/
│   │   └── db.ts               # SQLite init + table creation
│   ├── services/
│   │   ├── scheduleService.ts
│   │   ├── courseService.ts
│   │   └── noteService.ts
│   ├── hooks/
│   │   ├── useSchedules.ts
│   │   ├── useCourses.ts
│   │   └── useNotes.ts
│   ├── components/
│   │   ├── BubbleNav.tsx       # Floating radial nav
│   │   ├── ScheduleCard.tsx
│   │   ├── ScheduleDetailModal.tsx
│   │   └── SafeScreen.tsx
│   ├── context/
│   │   └── ThemeContext.tsx    # 5 color schemes × light/dark
│   ├── constants/
│   │   └── scheduleTypes.ts   # Type colors + dark mode variants
│   └── utils/
│       ├── dateUtils.ts
│       └── uuid.ts
└── assets/
    └── images/
        └── notification-icon.png   # SnowEd mascot
```

---

## ⬇️ Download

Get the latest APK from the [**Releases**](https://github.com/rmfsantos0704/nurse-scheduler-app/releases/tag/v1.0.0) page.

**Direct download:** [SnowEd v1.0.0 APK](https://github.com/rmfsantos0704/nurse-scheduler-app/releases/tag/v1.0.0)

**Requirements:**
- Android 8.0 (Oreo) or higher
- Allow installation from unknown sources when prompted

---

## 🌐 Landing Page

The SnowEd landing page is built with Next.js 14 and deployed on Vercel.

**Repo:** [`snowed-landing`](https://github.com/rmfsantos0704/snowed-landing)  
**Live:** [your-landing-url.vercel.app](https://your-landing-url.vercel.app)

---

## 📚 Citations & Acknowledgments

This project makes use of the following third-party assets, APIs, and libraries:

- [React Native](https://reactnative.dev/) — Mobile framework by Meta, MIT License
- [Expo](https://expo.dev/) — Managed workflow + native modules, MIT License
- [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) — On-device SQLite storage
- [react-native-pell-rich-editor](https://github.com/wxik/react-native-pell-rich-editor) — Rich text editor, MIT License
- [Ionicons](https://ionic.io/ionicons) — Icon library by Ionic, MIT License
- [Wikipedia API](https://www.mediawiki.org/wiki/API:Main_page) — Article content licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
- [Next.js](https://nextjs.org/) — Landing page framework by Vercel, MIT License
- [Vercel](https://vercel.com/) — Landing page hosting

---

## 📄 License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for more information.

---

<p align="center">
  Built with ❤️ for students everywhere · Free and open forever
</p>
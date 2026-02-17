# Word Game Challenge 🎮

A modern, browser-based word guessing game built with vanilla JavaScript. Challenge yourself to guess words of varying lengths with real-time feedback and track your stats!

## Features ✨

- Customizable word length (3-10 letters)
- Interactive color-coded feedback system
  - ✅ Green: Perfect! Correct letter in the correct position
  - 🟡 Yellow: Good! The letter is in the word, but in the wrong position
  - ❌ Red: Nope! The letter is not in the word
- Real-time timer tracking
- Persistent stats
- Interactive on-screen keyboard
- Responsive design with smooth animations
- Integration with Datamuse API for word dictionary
- Progressive Web App (PWA) capabilities
  - Works offline with service worker caching
  - Installable on mobile and desktop devices
- Production-grade optimizations
  - Code splitting for faster loading
  - Gzip compression for smaller file sizes
  - Environment variable configuration

## Tech Stack 🛠️

- Vanilla TypeScript (ESNext)
- HTML5
- CSS3
- Vite for bundling and optimization
  - Fast development server with HMR
  - Code splitting for performance
  - Asset optimization and compression
  - Environment variables support
- Progressive Web App (PWA) features
  - Service Worker for offline functionality
  - Installable web app with manifest
- ESLint for code quality
- [Datamuse API](https://www.datamuse.com/api/) for word dictionary

## Setup and Installation 🚀

1. Clone the repository:
   ```bash
   git clone https://github.com/idmcalculus/wordGameChallenge.git
   cd wordGameChallenge
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env file with your configuration
   ```
   Logging and client error capture:
   - `VITE_ENABLE_DEBUG_LOGS=true` enables browser logs in development/testing.
   - Keep it `false` in production for a silent console.
   - `VITE_CLIENT_ERROR_ENDPOINT` can be set to capture runtime errors server-side.
   - Captured client errors are also stored locally and can be viewed with:
     - `window.getWordGameClientErrors()`
     - `window.clearWordGameClientErrors()`

4. Development mode:
   ```bash
   bun run dev
   ```

5. Production build:
   ```bash
   bun run build
   ```

6. Preview production build locally:
   ```bash
   bun run preview
   ```

7. Lint code:
   ```bash
   bun run lint
   # Or to automatically fix issues:
   bun run lint:fix
   ```

8. Type-check core game modules:
   ```bash
   bun run typecheck
   ```

9. Open your browser and navigate to:
   - `http://localhost:8080`

## How to Play 🎯

1. Enter a word length between 3 and 10 letters
2. Click "Start Game"
3. Type your guess using your keyboard or click the on-screen keyboard tiles
4. The on-screen keyboard also shows the current status of each letter
5. Get feedback through colors:
   - ✅ Green: Perfect! Correct letter in the correct position
   - 🟡 Yellow: Good! The letter is in the word, but in the wrong position
   - ❌ Red: Nope! The letter is not in the word
6. You have 5 attempts to guess the word
7. Try to beat your best time!

## Project Structure 📁

```
wordGameChallenge/
├── src/
│   ├── index.html                 # Main HTML file
│   ├── scss/                      # SCSS styling files
│   ├── js/
│   │   ├── app.ts                 # Application entry point
│   │   ├── WordGame.ts            # Game flow orchestration
│   │   ├── apiHandler.ts          # Word API integration
│   │   ├── uiHandler.ts           # Game UI rendering helpers
│   │   ├── modals.ts              # Modal setup and alert handling
│   │   ├── hintHandler.ts         # Hint button logic
│   │   ├── themeManager.ts        # Theme toggle and system syncing
│   │   ├── core/
│   │   │   └── gameEngine.ts      # Pure guess evaluation rules
│   │   ├── repositories/
│   │   │   └── statsRepository.ts # Stats migration/persistence
│   │   ├── components/
│   │   │   └── StatsManager.ts    # Stats table/filter/sort/pagination
│   │   ├── types/
│   │   │   ├── types.ts           # Shared union/value types
│   │   │   └── interface.ts       # Shared interfaces/contracts
│   │   └── utils/                 # Timer, logger, error reporting, filters/sort
├── public/                        # Static assets served as-is
├── docs/
│   └── ARCHITECTURE.md            # Module boundaries and runtime flow
├── dist/                          # Production build output
├── vite.config.js                 # Vite configuration
├── package.json                   # Dependencies and scripts
├── eslint.config.js               # ESLint configuration
├── .env                           # Environment variables (production)
├── .env.example                   # Environment variables template
└── README.md
```

## Architecture Notes

- See `docs/ARCHITECTURE.md` for module responsibilities and contribution guidelines.

## Contributing 🤝

Feel free to submit issues and enhancement requests!

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License 📝

This project is licensed under the MIT License - see the LICENSE file for details.

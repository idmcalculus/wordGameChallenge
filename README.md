# Word Game Challenge 🎮

A modern, browser-based word guessing game built with vanilla JavaScript. Challenge yourself to guess words of varying lengths with real-time feedback and track your high scores!

## Features ✨

- Customizable word length (3-10 letters)
- Interactive color-coded feedback system
  - 🟩 Green: Letter is correct and in the right position
  - 🟧 Orange: Letter exists in the word but wrong position
  - ⬜ Grey: Letter not in the word
- Real-time timer tracking
- Persistent high scores
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

- Vanilla JavaScript (ES6+)
- HTML5
- CSS3
- Webpack for bundling and optimization
  - Code splitting for performance
  - Asset optimization and compression
  - Environment variables support
- Progressive Web App (PWA) features
  - Service Worker for offline functionality
  - Installable web app with manifest
- ESLint for code quality
- Babel for JavaScript transpilation
- [Datamuse API](https://www.datamuse.com/api/) for word dictionary

## Setup and Installation 🚀

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/wordGameChallenge.git
   cd wordGameChallenge
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env file with your configuration
   ```

4. Development mode:
   ```bash
   npm run dev
   ```

5. Production build:
   ```bash
   npm run build
   ```

6. Analyze bundle size (optional):
   ```bash
   npm run analyze
   ```

7. Lint code:
   ```bash
   npm run lint
   # Or to automatically fix issues:
   npm run lint:fix
   ```

8. Serve production build locally:
   ```bash
   npm run serve:dist
   ```

9. Open your browser and navigate to:
   - `http://localhost:8080`

## How to Play 🎯

1. Enter a word length between 3 and 10 letters
2. Click "Start Game"
3. Type your guess and press Enter or click to submit
4. Get feedback through colors:
   - Green: Correct letter in correct position
   - Orange: Correct letter in wrong position
   - Grey: Letter not in word
5. You have 5 attempts to guess the word
6. Try to beat your best time!

## Project Structure 📁

```
wordGameChallenge/
├── src/
│   ├── index.html                  # Main HTML file
│   ├── styles.css                  # Styling
│   ├── manifest.json               # PWA manifest file
│   ├── js/
│   │   ├── app.js                  # Application entry point
│   │   ├── WordGame.js             # Core game logic
│   │   ├── apiHandler.js           # Word API integration
│   │   ├── gameUtils.js            # Utility functions
│   │   ├── modals.js               # Alert modal system
│   │   ├── uiHandler.js            # UI updates and rendering
│   │   └── serviceWorkerRegistration.js  # PWA service worker registration
│   └── assets/
│       ├── icons/                  # PWA icons
│       └── favicon.ico             # Favicon
├── dist/                           # Production build output
├── webpack.config.js               # Webpack configuration
├── package.json                    # Dependencies and scripts
├── .babelrc                        # Babel configuration
├── .eslintrc.js                    # ESLint configuration
├── .env                            # Environment variables (production)
├── .env.example                    # Environment variables template
└── README.md
```

## Contributing 🤝

Feel free to submit issues and enhancement requests!

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License 📝

This project is licensed under the MIT License - see the LICENSE file for details.

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

## Tech Stack 🛠️

- Vanilla JavaScript (ES6+)
- HTML5
- CSS3
- [Datamuse API](https://www.datamuse.com/api/) for word dictionary

## Setup and Installation 🚀

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/wordGameChallenge.git
   cd wordGameChallenge
   ```

2. Start a local server:
   
   Using Python (Python 3):
   ```bash
   python -m http.server 8000
   ```
   
   Or using Node.js:
   ```bash
   npx http-server
   ```

3. Open your browser and navigate to:
   - Python: `http://localhost:8000`
   - Node.js: `http://localhost:8080`

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
├── index.html          # Main HTML file
├── styles.css         # Styling
├── js/
│   ├── app.js         # Application entry point
│   ├── WordGame.js    # Core game logic
│   ├── apiHandler.js  # Word API integration
│   ├── gameUtils.js   # Utility functions
│   ├── modals.js      # Alert modal system
│   └── uiHandler.js   # UI updates and rendering
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

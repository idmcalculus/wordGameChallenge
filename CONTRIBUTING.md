# Contributing to Word Game Challenge

First off, thank you for considering contributing to Word Game Challenge! It's people like you that make this game better for everyone.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Enhancements](#suggesting-enhancements)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to project maintainers.

### Our Pledge

- We pledge to make participation in our project a harassment-free experience for everyone
- We pledge to be respectful of differing viewpoints and experiences
- We pledge to show empathy towards other community members

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Create a new branch for your feature/fix
4. Make your changes
5. Test your changes thoroughly
6. Push to your fork
7. Submit a Pull Request

## Development Process

### Setting Up Development Environment

1. Install [Bun](https://bun.sh/) and ensure `bun --version` works
2. Install dependencies with `bun install`
3. Copy env file with `cp .env.example .env`
4. Start dev server with `bun run dev`
5. Validate with:
   - `bun run lint`
   - `bun run typecheck`
   - `bun run test:coverage`
   - `bun run build`

### Project Structure

```
wordGameChallenge/
├── src/
│   ├── index.html
│   ├── scss/
│   └── js/
│       ├── controllers/
│       │   ├── GameController.ts
│       │   ├── BoardController.ts
│       │   ├── KeyboardController.ts
│       │   └── TimerController.ts
│       ├── core/gameEngine.ts     # Pure guess evaluation rules
│       ├── core/gameSession.ts    # In-memory gameplay session state
│       ├── repositories/statsRepository.ts
│       ├── components/StatsManager.ts
│       ├── types/types.ts
│       ├── types/interface.ts
│       ├── uiHandler.ts
│       ├── hintHandler.ts
│       └── modals.ts
├── docs/
│   └── ARCHITECTURE.md
```

## Pull Request Process

1. Update the README.md with details of changes if applicable
2. Update the documentation with details of any interface changes
3. The PR will be merged once you have the sign-off of at least one maintainer

### PR Checklist

- [ ] Code follows the style guidelines
- [ ] Documentation has been updated
- [ ] Changes generate no new warnings
- [ ] Tests have been added/updated
- [ ] All tests pass locally

## Coding Standards

### TypeScript

- Use strict TypeScript types and avoid `any`
- Follow airbnb style guide
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused
- Use consistent spacing and indentation (2 spaces)

### Testing and Coverage

- Use unit tests for pure logic in `src/js/core/`, `src/js/repositories/`, and pure utility modules.
- Use jsdom tests for UI behavior in controllers/components.
- The repository enforces a `95%` coverage threshold on deterministic modules (core/repository/utils/api boundary), while UI tests are expected but not used as the hard coverage gate.
- When changing stats behavior, add/update tests for:
  - pagination (`20` initial rows, then `10` per click),
  - `Load More` hiding when all rows are shown,
  - filter/sort rerender behavior.

### CSS

- Use meaningful class names
- Follow BEM naming convention
- Keep selectors as simple as possible
- Group related properties
- Use CSS variables for repeated values

### HTML

- Use semantic HTML elements
- Ensure proper indentation
- Keep markup clean and minimal
- Use descriptive IDs and classes

## Reporting Bugs

### Before Submitting A Bug Report

1. **Check the Documentation**
   - Review the README.md for correct setup instructions
   - Check the game rules and known limitations
   - Verify you're using the correct word length range (3-10)

2. **Search Existing Issues**
   - Search both open and closed issues
   - Look for similar symptoms or error messages
   - Check if it's a known limitation

3. **Test Latest Version**
   - Clear your browser cache
   - Refresh the page to ensure you're not running stale code
   - Try in an incognito/private window

4. **Collect Information**
   - Note any console errors (Right-click → Inspect → Console)
   - Check network requests for API failures
   - Record the exact steps that trigger the bug
   - Note any patterns (specific word lengths, letters, or actions)

### Game-Specific Troubleshooting

1. **Word Validation Issues**
   - Verify word length matches selected length
   - Check if the word exists in common dictionaries
   - Note if the issue occurs with specific word patterns

2. **UI/Display Problems**
   - Check if letter colors update correctly
   - Verify keyboard feedback matches game grid
   - Note any animation or transition issues

3. **Scoring/Timer Issues**
   - Check if stats are saving correctly
   - Verify timer accuracy
   - Note any synchronization problems

4. **API-Related Issues**
   - Check network tab for Datamuse API errors
   - Note any timeout or connection issues
   - Record the exact query that failed

### Bug Report Template

**Description:**
Provide a clear, concise description of the bug. Example: "Game doesn't accept valid 5-letter words" or "Stats not saving after winning game".

**Game State:**
- Word Length: [e.g., 5]
- Current Attempt: [e.g., 2/5]
- Word Being Guessed: [if known]
- Game Mode: [if applicable]

**To Reproduce:**
Provide exact steps that anyone can follow to reproduce the issue. Example:

*For a word validation bug:*
1. Set word length to '5'
2. Click 'Start Game'
3. Type 'SMART' and press Enter
4. Try to enter 'BRAIN' in the next row
5. Note the error message displayed

*For a scoring bug:*
1. Set word length to '4'
2. Click 'Start Game'
3. Complete the game successfully in 3 attempts
4. Check stats list
5. Refresh the page
6. Note that the new stat is missing

*For a UI bug:*
1. Set word length to '6'
2. Click 'Start Game'
3. Enter 'CASTLE'
4. Note that the 'S' tile shows orange (exists) when it should be grey (not in word)
5. Check if the on-screen keyboard reflects the same incorrect color

**Expected Behavior:**
Clear description of what should happen. Example: "The word 'SMART' should be accepted as a valid 5-letter word".

**Actual Behavior:**
What actually happened. Example: "Game shows 'Invalid Word' error when entering 'SMART'".

**Screenshots/Videos:**
- Game state screenshot
- Console error screenshot (if applicable)
- Network request screenshot (if API-related)
- Recording of the issue (if behavior-related)

**Environment:**
- Browser [e.g., Chrome 120.0.6099.130]
- OS [e.g., macOS 14.3.1]
- Game Version [e.g., 1.0.0]
- Screen Resolution [e.g., 1920x1080]
- Device Type [e.g., Desktop/Mobile]

**Additional Context:**
- Any error messages from console
- Network response data (for API issues)
- Local storage content (for saving issues)
- Steps already tried to resolve the issue

## Suggesting Enhancements

### Enhancement Request Template

**Is your feature request related to a problem?**
A clear description of what the problem is.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
A clear description of any alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request here.

## Questions?

Feel free to contact the maintainers if you have any questions. We're here to help!

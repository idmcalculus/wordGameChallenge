/**
 * Start a timer that updates every second with formatted time
 * @param {Date} startTime - The time when the timer started
 * @param {HTMLElement} timerDisplay - The element to display the timer
 * @returns {number} - The timer interval ID
 */
export function startTimer(startTime, timerDisplay) {
  // Show the timer display if it's hidden
  timerDisplay.style.display = 'block';
  
  return setInterval(() => {
    const now = new Date();
    const elapsedMilliseconds = now - startTime;
    
    // Format time as MM:SS
    const totalSeconds = Math.floor(elapsedMilliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    // Add leading zeros if needed
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');
    
    timerDisplay.textContent = `Time: ${formattedMinutes}:${formattedSeconds}`;
  }, 1000);
}

/**
 * Stop the timer
 * @param {number} timerId - The timer interval ID to clear
 */
export function stopTimer(timerId) {
  clearInterval(timerId);
}
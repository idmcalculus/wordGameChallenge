export function startTimer(startTime, timerDisplay) {
  return setInterval(() => {
    const now = new Date();
    const seconds = Math.floor((now - startTime) / 1000);
    timerDisplay.textContent = `Time elapsed: ${seconds} seconds`;
  }, 1000);
}

export function stopTimer(timerId) {
  clearInterval(timerId);
}
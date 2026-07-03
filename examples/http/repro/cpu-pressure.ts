export const burnCpu = (durationMs: number): number => {
  const end = Date.now() + durationMs;
  let score = 0;

  while (Date.now() < end) {
    for (let candidate = 2; candidate < 5000; candidate += 1) {
      let isPrime = true;
      for (let divisor = 2; divisor * divisor <= candidate; divisor += 1) {
        if (candidate % divisor === 0) {
          isPrime = false;
          break;
        }
      }

      if (isPrime) {
        score += candidate;
      }
    }
  }

  return score;
};

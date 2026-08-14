/**
 * Calculates the binomial coefficient (n choose k).
 */
function combination(n, k) {
    if (k < 0 || k > n) return 0
    if (k === 0 || k === n) return 1
    if (k > n / k) k = n - k
    
    let c = 1
    for (let i = 1; i <= k; i++) {
        c = c * (n - (i - 1)) / i
    }

    return c
}

/**
 * Calculates the probability of exactly k successes in n trials (Binomial Probability Mass Function).
 */
function binomialProbability(n, k, p = 0.5) {
    return combination(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k)
}

/**
 * Calculates the p-value for an ABX / Binomial test.
 * 
 * @param {number} correct - Number of correct trials (k)
 * @param {number} trials - Total number of trials (n)
 * @returns {number} One-tailed p-value
 */
function calculatePValue(correct, trials) {
    if (correct > trials || correct < 0) {
        throw new Error('Correct trials cannot exceed total trials and must be >= 0.')
    }

    const p = 0.5
    let oneTailed = 0

    // One-tailed: Probability of getting correct or MORE trials right by chance
    for (let i = correct; i <= trials; i++) {
        oneTailed += binomialProbability(trials, i, p)
    }

    return Number(oneTailed.toFixed(3))
}

export { calculatePValue }
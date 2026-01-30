/**
 * Module de retry automatique avec backoff exponentiel
 * 
 * Permet de réessayer une opération asynchrone en cas d'échec
 * avec des délais croissants entre chaque tentative.
 */

export interface RetryOptions {
  maxAttempts?: number;        // Nombre maximum de tentatives (défaut: 3)
  initialDelayMs?: number;      // Délai initial en ms (défaut: 1000)
  backoffMultiplier?: number;   // Multiplicateur pour le backoff (défaut: 2)
  onRetry?: (attempt: number, error: Error) => void; // Callback avant chaque retry
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
}

/**
 * Exécute une fonction asynchrone avec retry automatique et backoff exponentiel
 * 
 * @param fn - Fonction asynchrone à exécuter
 * @param options - Options de retry
 * @returns Résultat avec succès/erreur et nombre de tentatives
 * 
 * @example
 * const result = await retryWithBackoff(
 *   async () => await transcribeAudio(url),
 *   { maxAttempts: 3, initialDelayMs: 1000 }
 * );
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    backoffMultiplier = 2,
    onRetry,
  } = options;

  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn();
      return {
        success: true,
        result,
        attempts: attempt,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Si c'est la dernière tentative, on ne retry pas
      if (attempt === maxAttempts) {
        break;
      }
      
      // Callback avant retry
      if (onRetry) {
        onRetry(attempt, lastError);
      }
      
      // Calcul du délai avec backoff exponentiel
      // Tentative 1: 1s, Tentative 2: 2s, Tentative 3: 4s
      const delayMs = initialDelayMs * Math.pow(backoffMultiplier, attempt - 1);
      
      // Attendre avant le prochain essai
      await sleep(delayMs);
    }
  }
  
  return {
    success: false,
    error: lastError,
    attempts: maxAttempts,
  };
}

/**
 * Fonction utilitaire pour attendre un certain temps
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Détermine si une erreur est retryable
 * 
 * @param error - Erreur à analyser
 * @returns true si l'erreur est retryable, false sinon
 */
export function isRetryableError(error: Error): boolean {
  const retryableMessages = [
    "ECONNRESET",
    "ETIMEDOUT",
    "ENOTFOUND",
    "ECONNREFUSED",
    "Network request failed",
    "timeout",
    "rate limit",
    "too many requests",
    "503", // Service Unavailable
    "502", // Bad Gateway
    "504", // Gateway Timeout
  ];
  
  const errorMessage = error.message.toLowerCase();
  return retryableMessages.some((msg) => errorMessage.includes(msg.toLowerCase()));
}

/**
 * Wrapper pour retry avec vérification si l'erreur est retryable
 * 
 * @param fn - Fonction asynchrone à exécuter
 * @param options - Options de retry
 * @returns Résultat avec succès/erreur et nombre de tentatives
 */
export async function retryIfRetryable<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  try {
    const result = await fn();
    return {
      success: true,
      result,
      attempts: 1,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    
    // Si l'erreur n'est pas retryable, on retourne directement
    if (!isRetryableError(err)) {
      return {
        success: false,
        error: err,
        attempts: 1,
      };
    }
    
    // Sinon, on retry avec backoff
    return retryWithBackoff(fn, options);
  }
}

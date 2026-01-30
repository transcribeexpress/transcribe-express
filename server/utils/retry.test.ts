/**
 * Tests pour le module retry.ts
 * 
 * Teste le retry automatique avec backoff exponentiel
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { retryWithBackoff, isRetryableError, retryIfRetryable } from './retry';

describe('retry module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('retryWithBackoff', () => {
    it('should succeed on first attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      
      const result = await retryWithBackoff(fn, { maxAttempts: 3 });
      
      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(1);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed on second attempt', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce('success');
      
      const result = await retryWithBackoff(fn, { 
        maxAttempts: 3,
        initialDelayMs: 10, // Court délai pour les tests
      });
      
      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(2);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should fail after max attempts', async () => {
      const error = new Error('Persistent error');
      const fn = vi.fn().mockRejectedValue(error);
      
      const result = await retryWithBackoff(fn, { 
        maxAttempts: 3,
        initialDelayMs: 10,
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
      expect(result.attempts).toBe(3);
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should call onRetry callback before each retry', async () => {
      const error = new Error('Test error');
      const fn = vi.fn()
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success');
      
      const onRetry = vi.fn();
      
      await retryWithBackoff(fn, { 
        maxAttempts: 3,
        initialDelayMs: 10,
        onRetry,
      });
      
      expect(onRetry).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenCalledWith(1, error);
      expect(onRetry).toHaveBeenCalledWith(2, error);
    });

    it('should use exponential backoff delays', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Attempt 1'))
        .mockRejectedValueOnce(new Error('Attempt 2'))
        .mockResolvedValueOnce('success');
      
      const startTime = Date.now();
      
      await retryWithBackoff(fn, { 
        maxAttempts: 3,
        initialDelayMs: 100,
        backoffMultiplier: 2,
      });
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Délais attendus : 100ms + 200ms = 300ms
      // Avec une marge de 100ms pour l'exécution
      expect(totalTime).toBeGreaterThanOrEqual(250);
      expect(totalTime).toBeLessThan(500);
    });
  });

  describe('isRetryableError', () => {
    it('should identify network errors as retryable', () => {
      expect(isRetryableError(new Error('ECONNRESET'))).toBe(true);
      expect(isRetryableError(new Error('ETIMEDOUT'))).toBe(true);
      expect(isRetryableError(new Error('ENOTFOUND'))).toBe(true);
      expect(isRetryableError(new Error('Network request failed'))).toBe(true);
    });

    it('should identify rate limit errors as retryable', () => {
      expect(isRetryableError(new Error('rate limit exceeded'))).toBe(true);
      expect(isRetryableError(new Error('too many requests'))).toBe(true);
    });

    it('should identify HTTP 5xx errors as retryable', () => {
      expect(isRetryableError(new Error('503 Service Unavailable'))).toBe(true);
      expect(isRetryableError(new Error('502 Bad Gateway'))).toBe(true);
      expect(isRetryableError(new Error('504 Gateway Timeout'))).toBe(true);
    });

    it('should identify non-retryable errors', () => {
      expect(isRetryableError(new Error('Invalid input'))).toBe(false);
      expect(isRetryableError(new Error('Authentication failed'))).toBe(false);
      expect(isRetryableError(new Error('404 Not Found'))).toBe(false);
    });
  });

  describe('retryIfRetryable', () => {
    it('should succeed on first attempt without retry', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      
      const result = await retryIfRetryable(fn);
      
      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(1);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should not retry non-retryable errors', async () => {
      const error = new Error('Invalid input');
      const fn = vi.fn().mockRejectedValue(error);
      
      const result = await retryIfRetryable(fn, { 
        maxAttempts: 3,
        initialDelayMs: 10,
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
      expect(result.attempts).toBe(1);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry retryable errors', async () => {
      const error = new Error('ETIMEDOUT');
      const fn = vi.fn()
        .mockRejectedValueOnce(error) // Premier appel dans retryIfRetryable
        .mockResolvedValueOnce('success'); // Premier appel dans retryWithBackoff
      
      const result = await retryIfRetryable(fn, { 
        maxAttempts: 3,
        initialDelayMs: 10,
      });
      
      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      // retryWithBackoff retourne attempts=1 car il réussit au premier essai
      expect(result.attempts).toBe(1);
      expect(fn).toHaveBeenCalledTimes(2); // 1 dans retryIfRetryable + 1 dans retryWithBackoff
    });
  });
});

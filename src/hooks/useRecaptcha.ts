import { useCallback } from 'react';

/**
 * Hook for reCAPTCHA v3 integration
 */
export function useRecaptcha() {
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  /**
   * Execute reCAPTCHA and get token
   * @param action - The action name (e.g., 'login', 'signup', 'submit')
   */
  const executeRecaptcha = useCallback(
    async (action: string): Promise<string> => {
      if (!siteKey) {
        console.warn('reCAPTCHA site key not found. Skipping verification.');
        return '';
      }

      try {
        // Wait for grecaptcha to be ready
        await new Promise<void>((resolve) => {
          if (window.grecaptcha) {
            window.grecaptcha.ready(() => resolve());
          } else {
            // If grecaptcha is not loaded, skip verification
            console.warn('reCAPTCHA not loaded. Skipping verification.');
            resolve();
          }
        });

        // Execute reCAPTCHA
        if (window.grecaptcha) {
          const token = await window.grecaptcha.execute(siteKey, { action });
          return token;
        }

        return '';
      } catch (error) {
        console.error('reCAPTCHA execution error:', error);
        return '';
      }
    },
    [siteKey]
  );

  return { executeRecaptcha };
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

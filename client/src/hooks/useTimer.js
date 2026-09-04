import { useState, useEffect, useRef, useCallback } from 'react';

export function useTimer(initialTime, onTimeout) {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);

  const start = useCallback(() => {
    setTimeLeft(initialTime);
    setIsRunning(true);
    startTimeRef.current = Date.now();
  }, [initialTime]);

  const stop = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const getElapsed = useCallback(() => {
    if (!startTimeRef.current) return 0;
    return Date.now() - startTimeRef.current;
  }, []);

  useEffect(() => {
    if (!isRunning) return;

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setIsRunning(false);
          onTimeout?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, onTimeout]);

  useEffect(() => {
    setTimeLeft(initialTime);
  }, [initialTime]);

  const progress = initialTime > 0 ? timeLeft / initialTime : 0;

  return { timeLeft, progress, isRunning, start, stop, getElapsed };
}

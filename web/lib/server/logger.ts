function createLogger(name: string) {
  return {
    info: (...args: any[]) => console.log(`[${name}][INFO]`, ...args),
    warn: (...args: any[]) => console.warn(`[${name}][WARN]`, ...args),
    error: (...args: any[]) => console.error(`[${name}][ERROR]`, ...args),
    debug: (...args: any[]) => console.debug(`[${name}][DEBUG]`, ...args),
  };
}

export const vitalsLogger = createLogger('vitals');
export const healthSummaryLogger = createLogger('healthSummary');
export const reprocessLogger = createLogger('reprocess');

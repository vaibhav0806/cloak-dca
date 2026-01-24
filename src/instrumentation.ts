/**
 * Next.js Instrumentation
 *
 * This runs once when the server starts.
 * We use it to start the DCA keeper cron job.
 */

export async function register() {
  // Temporarily disabled to debug 502 errors
  // if (process.env.NEXT_RUNTIME === 'nodejs') {
  //   const { startKeeperCron } = await import('@/lib/keeper-cron');
  //   startKeeperCron();
  // }
}

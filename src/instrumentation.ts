/**
 * Next.js Instrumentation
 *
 * This runs once when the server starts.
 * We use it to start the DCA keeper cron job.
 */

export async function register() {
  // Only run on server and in production
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startKeeperCron } = await import('@/lib/keeper-cron');
    startKeeperCron();
  }
}

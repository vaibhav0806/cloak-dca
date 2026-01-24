/**
 * Keeper Cron Job
 *
 * Runs every 15 minutes to execute due DCA trades.
 * This replaces Vercel's cron functionality.
 */

import cron from 'node-cron';

let isRunning = false;

async function executeKeeper() {
  if (isRunning) {
    console.log('[Keeper] Previous execution still running, skipping...');
    return;
  }

  isRunning = true;
  console.log(`[Keeper] Starting execution at ${new Date().toISOString()}`);

  try {
    // Call the keeper API endpoint internally using localhost (not public URL)
    const port = process.env.PORT || 3000;
    const response = await fetch(`http://localhost:${port}/api/keeper/execute`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET || ''}`,
      },
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`[Keeper] Execution complete:`, result);
    } else {
      const error = await response.text();
      console.error(`[Keeper] Execution failed:`, error);
    }
  } catch (error) {
    console.error('[Keeper] Error:', error);
  } finally {
    isRunning = false;
  }
}

export function startKeeperCron() {
  // Run every 15 minutes
  const schedule = process.env.KEEPER_CRON_SCHEDULE || '*/15 * * * *';

  console.log(`[Keeper] Starting cron scheduler with schedule: ${schedule}`);

  cron.schedule(schedule, () => {
    executeKeeper();
  });

  // Also run once on startup after a short delay (let the server fully start)
  setTimeout(() => {
    console.log('[Keeper] Running initial execution...');
    executeKeeper();
  }, 10000); // 10 second delay

  console.log('[Keeper] Cron scheduler started');
}

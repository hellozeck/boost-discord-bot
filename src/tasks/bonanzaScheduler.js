const cron = require('node-cron');
const supabase = require('../utils/supabase');
const { runBonanza } = require('./runBonanza'); 
// Run at UTC 00:00 every day
cron.schedule('0 0 * * *', async () => {
    try {
        // Check if Bonanza is enabled
        const { data, error } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', 'bonanza_enabled')
            .single();

        if (error) throw error;

        if (data?.value === true) {
            console.log('Start executing Daily Bonanza...');
            await runBonanza();
        } else {
            console.log('Daily Bonanza is currently disabled, skipping execution');
        }
    } catch (error) {
        console.error('Bonanza scheduling error:', error);
    }
}); 
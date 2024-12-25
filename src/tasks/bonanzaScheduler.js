const cron = require('node-cron');
const supabase = require('../utils/supabase');
const { runBonanza } = require('./runBonanza'); // 你现有的抽奖逻辑

// 每天 UTC 00:00 运行
cron.schedule('0 0 * * *', async () => {
    try {
        // 检查 Bonanza 是否启用
        const { data, error } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', 'bonanza_enabled')
            .single();

        if (error) throw error;

        if (data?.value === true) {
            console.log('开始执行 Daily Bonanza...');
            await runBonanza();
        } else {
            console.log('Daily Bonanza 当前已禁用，跳过执行');
        }
    } catch (error) {
        console.error('Bonanza 调度错误:', error);
    }
}); 
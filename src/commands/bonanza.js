const { SlashCommandBuilder } = require('discord.js');
const supabase = require('../utils/supabase');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bonanza')
        .setDescription('管理 Daily Bonanza 状态')
        .addSubcommand(subcommand =>
            subcommand
                .setName('enable')
                .setDescription('启用 Daily Bonanza'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('禁用 Daily Bonanza'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('查看 Daily Bonanza 当前状态')),

    async execute(interaction) {
        // 验证管理员权限
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            await interaction.reply({
                content: '只有管理员可以管理 Bonanza 状态',
                ephemeral: true
            });
            return;
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'enable':
                    await enableBonanza(interaction);
                    break;
                case 'disable':
                    await disableBonanza(interaction);
                    break;
                case 'status':
                    await getBonanzaStatus(interaction);
                    break;
            }
        } catch (error) {
            console.error('Bonanza 命令错误:', error);
            await interaction.reply({
                content: '执行命令时发生错误，请稍后重试',
                ephemeral: true
            });
        }
    },
};

async function enableBonanza(interaction) {
    const { error } = await supabase
        .from('system_settings')
        .upsert({
            key: 'bonanza_enabled',
            value: true,
            updated_at: new Date().toISOString()
        });

    if (error) throw error;

    await interaction.reply({
        content: '✅ Daily Bonanza 已启用！每天 UTC 00:00 将自动执行抽奖。',
        ephemeral: false
    });
}

async function disableBonanza(interaction) {
    const { error } = await supabase
        .from('system_settings')
        .upsert({
            key: 'bonanza_enabled',
            value: false,
            updated_at: new Date().toISOString()
        });

    if (error) throw error;

    await interaction.reply({
        content: '⏸️ Daily Bonanza 已禁用。',
        ephemeral: false
    });
}

async function getBonanzaStatus(interaction) {
    const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'bonanza_enabled')
        .single();

    if (error) throw error;

    const status = data?.value ? '已启用' : '已禁用';
    await interaction.reply({
        content: `🎯 Daily Bonanza 当前状态: ${status}`,
        ephemeral: true
    });
} 
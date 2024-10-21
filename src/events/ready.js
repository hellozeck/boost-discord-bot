module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        console.log(`已登录为 ${client.user.tag}`);
    },
};

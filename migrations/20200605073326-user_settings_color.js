module.exports = {
    async up(db, client) {
        await db.collection('users').updateMany({}, {
            $set: {
                'settings.color': '#DF62A9',
                'settings.isColorblind': false
            }
        })
    },

    async down(db, client) {
        await db.collection('users').updateMany({}, {
            $unset: {
                'settings.color': 1,
                'settings.isColorblind': 1
            }
        })
    }
};
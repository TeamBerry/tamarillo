module.exports = {
    async up(db, client) {
        await db.collection('boxes').updateMany({}, { $set: { 'options.berries': true } })
    },

    async down(db, client) {
        await db.collection('boxes').updateMany({}, { $unset: { 'options.berries': 1 } })
    }
};

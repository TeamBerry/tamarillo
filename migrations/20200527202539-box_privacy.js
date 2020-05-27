module.exports = {
    async up(db, client) {
        await db.collection('boxes').updateMany({}, { $set: { 'private': false } })
    },

    async down(db, client) {
        await db.collection('boxes').updateMany({}, { $unset: { 'private': 1 } })
    }
};
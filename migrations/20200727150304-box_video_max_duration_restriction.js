module.exports = {
    async up(db, client) {
        await db.collection('boxes').updateMany({}, { $set: { 'options.videoMaxDurationLimit': 0 } });
    },

    async down(db, client) {
        await db.collection('boxes').updateMany({}, { $unset: { 'options.videoMaxDurationLimit': 1 } });
    }
};

module.exports = {
    async up(db, client) {
        await db.createCollection('userplaylists')

        await db.collection('users').find().forEach((user) => {
            db.collection('userplaylists').insertOne({
                name: 'Favorites',
                user: user._id,
                videos: user.favorites,
                isDeletable: false
            })
        })

        await db.collection('users').updateMany({}, { $unset: { favorites: '' } })
    },

    async down(db, client) {
        await db.collection('userplaylists').deleteMany({ name: 'Favorites' })

        await db.collection('users').updateMany({}, { $set: { favorites: [] } })
    }
};

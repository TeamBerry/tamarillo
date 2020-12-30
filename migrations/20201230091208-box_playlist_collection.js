module.exports = {
  async up(db, client) {
    // TODO write your migration here.
    // See https://github.com/seppevs/migrate-mongo/#creating-a-new-migration-script
    // Example:
    // await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: true}});
    // Find every box
    await db.collection('boxes').find().forEach((box) => {
        box.playlist.forEach((queueItem) => {
            db.collection('queueItems').insertOne({
                box: box._id,
                ...queueItem
            })
        })
    })
        // For each box, create one queue item per entry in the playlist, with the box _id added in
  },

  async down(db, client) {
    // TODO write the statements to rollback your migration (if possible)
    // Example:
    // await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: false}});
      await db.collection('queueItems').deleteMany({})
  }
};

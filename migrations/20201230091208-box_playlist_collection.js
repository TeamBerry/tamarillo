module.exports = {
  async up(db, client) {
    // Find every box
    await db.collection('boxes').find().forEach((box) => {
        // For each box, create one queue item per entry in the playlist, with the box _id added in
        box.playlist.forEach((queueItem) => {
            db.collection('queueitems').insertOne({
                box: box._id,
                ...queueItem
            })
        })
    })
        
    await db.collection('queueitems').createIndex({ box: 1 })
  },

  async down(db, client) {
      await db.collection('queueitems').deleteMany({})
      await db.collection('queueitems').dropIndexes()
  }
};

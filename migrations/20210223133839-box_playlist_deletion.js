module.exports = {
  async up(db, client) {
        await db.collection('boxes').updateMany({}, { $unset: { 'playlist': 1 } })
        await db.collection('queueitems').updateMany({}, { $unset: { 'isPreselected': 1 } })
  },

  async down(db, client) {
      await db.collection('boxes').updateMany({}, { $set: { 'playlist': [] } })
      await db.collection('queueitems').updateMany({}, { $set: { 'isPreselected': false } })
  }
};

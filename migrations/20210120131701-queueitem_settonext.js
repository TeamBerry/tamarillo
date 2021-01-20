module.exports = {
  async up(db, client) {
        await db.collection('queueitems').updateMany({}, {
            $set: {
                'setToNext': null
            }
        })
  },

    async down(db, client) {
        await db.collection('queueitems').updateMany({}, {
            $unset: {
              'setToNext': 1
          }
      })
  }
};

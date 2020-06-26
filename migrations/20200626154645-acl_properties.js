module.exports = {
    async up(db, client) {
        // Update Subscribers
        const subscribers = await db.collection('subscribers').find({}).forEach(
            async (subscriber) => {
                const box = await db.collection('boxes').findOne({ _id: subscriber.boxToken });
                if (box && box.creator.toString() === subscriber.userToken) {
                    await db.collection('subscribers').updateOne({ _id: subscriber._id }, { $set: { role: 'admin' } });
                } else {
                    await db.collection('subscribers').updateOne({ _id: subscriber._id }, { $set: { role: 'simple' } });
                }
            }
        )

        // Update Users
        await db.collection('users').updateMany({}, {
            $set: {
                acl: {
                    moderator: ['addVideo', 'removeVideo', 'promoteVIP', 'demoteVIP', 'forceNext', 'forcePlay'],
                    vip: ['addVideo', 'removeVideo', 'forceNext'],
                    simple: ['addVideo']
                }
            }
        })

        // Update Boxes
        await db.collection('boxes').updateMany({}, {
            $set: {
                acl: {
                    moderator: ['addVideo', 'removeVideo', 'promoteVIP', 'demoteVIP', 'forceNext', 'forcePlay'],
                    vip: ['addVideo', 'removeVideo', 'forceNext'],
                    simple: ['addVideo']
                }
            }
        })
  },

    async down(db, client) {
      await db.collection('subscribers').updateMany({}, { $unset: { role: 1 } })
      await db.collection('users').updateMany({}, { $unset: { acl: 1 } })
      await db.collection('boxes').updateMany({}, { $unset: { acl: 1 } })
  }
};

module.exports = {
    async up(db, client) {
        // Users
        const users = await db.collection('users').find({});
        for await (user of users) {
            for (const role in user.acl) {
                let migratedPermissions = user.acl[role]
                .map(permission => permission.replace('promoteVIP', 'setVIP'))
                .map(permission => permission.replace('demoteVIP', 'unsetVIP'))
                
                user.acl[role] = migratedPermissions;
            }
            await db.collection('users').findOneAndUpdate(
                { _id: user._id },
                { $set: { acl: user.acl } }
            )
        }

        // Boxes
        const boxes = await db.collection('boxes').find({});
        for await (box of boxes) {
            for (const role in box.acl) {
                let migratedPermissions = box.acl[role]
                .map(permission => permission.replace('promoteVIP', 'setVIP'))
                .map(permission => permission.replace('demoteVIP', 'unsetVIP'))
                
                box.acl[role] = migratedPermissions;
            }
            await db.collection('boxes').findOneAndUpdate(
                { _id: box._id },
                { $set: { acl: box.acl } }
            )
        }
    },
  
    async down(db, client) {
        // Users
      const users = await db.collection('users').find({});
      for await (user of users) {
        for (const role in user.acl) {
            let migratedPermissions = user.acl[role]
                .map(permission => permission.replace(/^setVIP/gm, 'promoteVIP'))
                .map(permission => permission.replace('unsetVIP', 'demoteVIP'))
            
            user.acl[role] = migratedPermissions;
        }
        await db.collection('users').findOneAndUpdate(
            { _id: user._id },
            { $set: { acl: user.acl } }
        )
      }
        
        // Boxes
        const boxes = await db.collection('boxes').find({});
        for await (box of boxes) {
            for (const role in box.acl) {
                let migratedPermissions = box.acl[role]
                .map(permission => permission.replace(/^setVIP/gm, 'promoteVIP'))
                .map(permission => permission.replace('unsetVIP', 'demoteVIP'))
                
                box.acl[role] = migratedPermissions;
            }
            await db.collection('boxes').findOneAndUpdate(
                { _id: box._id },
                { $set: { acl: box.acl } }
            )
        }
    }
};
  
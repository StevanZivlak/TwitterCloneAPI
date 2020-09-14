const functions = require("firebase-functions")
const app = require("express")()
const FBAuth = require("./util/fbAuth")

const cors = require("cors")
app.use(cors())

const { db } = require("./util/admin")

const {
    getAllScreams,
    postOneScream,
    getScream,
    commentOnAScream,
    likeScream,
    unlikeScream,
    deleteScream
} = require("./handlers/screams")
const {
    signup,
    login,
    uploadImage,
    addUserDetails,
    getAuthenticatedUser,
    getUserDetails,
    markNotificationsRead
} = require("./handlers/users")

// Scream routes
app.get("/screams", getAllScreams)
app.post("/scream", FBAuth, postOneScream)
app.get("/scream/:screamId", getScream)
app.delete("/scream/:screamId", FBAuth, deleteScream)
// TODO delete scream
app.post("/scream/:screamId/like", FBAuth, likeScream)
app.post("/scream/:screamId/unlike", FBAuth, unlikeScream)
app.post("/scream/:screamId/comment", FBAuth, commentOnAScream)

// User routes
app.post("/signup", signup)
app.post("/login", login)
app.post("/user/image", FBAuth, uploadImage)
app.post("/user", FBAuth, addUserDetails)
app.get("/user", FBAuth, getAuthenticatedUser)
app.get("/user/:handle", getUserDetails)
app.post("/notifications", FBAuth, markNotificationsRead)

exports.api = functions.region("europe-west3").https.onRequest(app)

//
// trigger functions
//

exports.createNotificationOnLike = functions
    .region("europe-west3")
    .firestore.document("/likes/{id}")
    .onCreate((snapshot) => {
        return db
            .doc(`/screams/${snapshot.data().screamId}`)
            .get()
            .then((doc) => {
                if (doc.data().userHandle === snapshot.data().userHandle) {
                    return Promise.reject("No notifications when liking/unliking own posts.")
                }
                return db.doc(`/notifications/${snapshot.id}`).set({
                    createdAt: new Date().toISOString(),
                    recipient: doc.data().userHandle,
                    sender: snapshot.data().userHandle,
                    type: "like",
                    read: false,
                    screamId: doc.id //TODO: try with snapshot.data().screamId
                })
            })
            .catch((err) => {
                console.error(err)
            })
    })

exports.deleteNotificationOnUnlike = functions
    .region("europe-west3")
    .firestore.document("/likes/{id}")
    .onDelete((snapshot) => {
        return db
            .doc(`/notifications/${snapshot.id}`)
            .delete()
            .catch((err) => {
                console.error(err)
            })
    })

exports.createNotificationOnComment = functions
    .region("europe-west3")
    .firestore.document("/comments/{id}")
    .onCreate((snapshot) => {
        return db
            .doc(`/screams/${snapshot.data().screamId}`)
            .get()
            .then((screamDoc) => {
                if (screamDoc.data().userHandle === snapshot.data().userHandle) {
                    return Promise.reject("No notifications when commenting on own posts.")
                }
                return db.doc(`/notifications/${snapshot.id}`).set({
                    createdAt: new Date().toISOString(),
                    recipient: screamDoc.data().userHandle,
                    sender: snapshot.data().userHandle,
                    type: "comment",
                    read: false,
                    screamId: screamDoc.id
                })
            })
            .catch((err) => {
                console.error(err)
            })
    })

exports.onUserImageChange = functions
    .region("europe-west3")
    .firestore.document("/users/{id}")
    .onUpdate((change, _context) => {
        let batch = db.batch()
        if (change.before.data().imageUrl !== change.after.data().imageUrl) {
            return db
                .collection("screams")
                .where("userHandle", "==", change.before.data().handle)
                .get()
                .then((screamDocs) => {
                    screamDocs.forEach((screamDoc) => {
                        batch.update(screamDoc.ref, { imageUrl: change.after.data().imageUrl })
                    })
                    return batch.commit()
                })
                .catch((err) => {
                    console.log(err)
                })
        }
        return null
    })

/** Cleans up comments,likes and notifications connected to a scream when it is deleted. */
exports.onScreamDelete = functions
    .region("europe-west3")
    .firestore.document("/screams/{screamId}")
    .onDelete((snapshot, context) => {
        const screamId = context.params.screamId
        const batch = db.batch()
        return db
            .collection("comments")
            .where("screamId", "==", screamId)
            .get()
            .then((commentDocs) => {
                commentDocs.forEach((commentDoc) => {
                    batch.delete(commentDoc.ref)
                })
                return db.collection("likes").where("screamId", "==", screamId).get()
            })
            .then((likeDocs) => {
                likeDocs.forEach((likeDoc) => {
                    batch.delete(likeDoc.ref)
                })
                return db.collection("notifications").where("screamId", "==", screamId).get()
            })
            .then((notificationsDocs) => {
                notificationsDocs.forEach((notificationDoc) => {
                    batch.delete(notificationDoc.ref)
                })
                return batch.commit()
            })
            .catch((err) => {
                console.log(err)
            })
    })

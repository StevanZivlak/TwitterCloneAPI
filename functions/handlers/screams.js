const { db } = require("../util/admin")
const { response } = require("express")

exports.getAllScreams = (request, response) => {
    db.collection("screams")
        .orderBy("createdAt", "desc")
        .get()
        .then((data) => {
            let screams = []
            data.forEach((document) => {
                screams.push({
                    screamId: document.id,
                    ...document.data()
                })
            })
            return response.json(screams)
        })
        .catch((err) => console.error(err))
}

exports.postOneScream = (request, response) => {
    if (request.body.body.trim() === "")
        return response.status(400).json({ body: "Body must not be empty." })

    const newScream = {
        body: request.body.body,
        userHandle: request.user.handle,
        imageUrl: request.user.imageUrl,
        createdAt: new Date().toISOString(),
        likeCount: 0,
        commentCount: 0
    }

    db.collection("screams")
        .add(newScream)
        .then((doc) => {
            const resScream = newScream
            resScream.screamId = doc.id
            response.json(resScream)
        })
        .catch((err) => {
            response.status(500).json({ error: "Something went wrong." })
            console.error(err)
        })
}
// Fetch one scream (with comments)
exports.getScream = (request, response) => {
    let screamData = {}
    db.doc(`/screams/${request.params.screamId}`)
        .get()
        .then((doc) => {
            if (!doc.exists) {
                return response.status(404).json({ error: "Scream not found." })
            }
            screamData = doc.data()
            screamData.screamId = doc.id
            return db
                .collection("comments")
                .orderBy("createdAt", "desc")
                .where("screamId", "==", request.params.screamId)
                .get()
        })
        .then((comments) => {
            screamData.comments = []
            comments.forEach((comment) => {
                screamData.comments = [...screamData.comments, comment.data()]
                //screamData.comments.push(comment.data()) old js way
            })
            return response.json(screamData)
        })
        .catch((error) => {
            console.log(error)
            return response.status(500).json({ error: error.code })
        })
}
// Comment on a scream
exports.commentOnAScream = (request, response) => {
    if (request.body.body.trim() === "")
        return response.status(400).json({ comment: "Must not be empty." })
    const newComment = {
        body: request.body.body,
        createdAt: new Date().toISOString(),
        screamId: request.params.screamId,
        userHandle: request.user.handle,
        userImage: request.user.imageUrl
    }

    db.doc(`/screams/${request.params.screamId}`)
        .get()
        .then((doc) => {
            if (!doc.exists) {
                //return response.status(404).json({ error: "Scream not found." })
                return Promise.reject("Scream not found.")
            }
            const oldScreamCommentCount = doc.data().commentCount
            return doc.ref.update({ commentCount: oldScreamCommentCount + 1 })
        })
        .then((_writeResult) => {
            return db.collection("comments").add(newComment)
        })
        .then(() => {
            response.json(newComment)
        })
        .catch((error) => {
            console.log(error)
            response.status(500).json({ error: "Something went wrong.." })
        })
}

exports.likeScream = (request, response) => {
    const screamId = request.params.screamId
    const userHandle = request.user.handle
    const newLike = { userHandle, screamId }

    let screamData

    db.collection("likes")
        .where("screamId", "==", screamId)
        .where("userHandle", "==", userHandle)
        .limit(1)
        .get()
        .then((data) => {
            if (!data.empty) {
                return response.status(400).json({ error: "Scream already liked." })
            }
            return db.doc(`/screams/${screamId}`).get()
        })
        .then((doc) => {
            if (!doc.exists) {
                return response.status(404).json({ error: "Scream not found." })
            }
            screamData = doc.data()
            return db.collection("likes").add(newLike)
        })
        .then((_theLikeWeAdded) => {
            screamData.likeCount++
            return db.doc(`/screams/${screamId}`).update({ likeCount: screamData.likeCount })
        })
        .then((_writeResult) => {
            screamData.screamId = screamId
            return response.status(200).json(screamData)
        })
        .catch((err) => {
            response.status(500).json({ error: "Something went wrong." })
            console.error(err)
        })
}

exports.unlikeScream = (request, response) => {
    const screamId = request.params.screamId
    const userHandle = request.user.handle

    let screamData

    db.collection("likes")
        .where("screamId", "==", screamId)
        .where("userHandle", "==", userHandle)
        .limit(1)
        .get()
        .then((data) => {
            if (data.empty) {
                //throw new Error("Couldn't find the like to unlike.") alternative
                return Promise.reject("Couldn't find the like to unlike.")
            }
            const likeToDelete = data.docs[0]
            return db.doc(`/likes/${likeToDelete.id}`).delete()
        })
        .then((_writeresult) => {
            return db.doc(`/screams/${screamId}`).get()
        })
        .then((doc) => {
            screamData = doc.data()
            if (!doc.exists) {
                return response
                    .status(404)
                    .json({ status: "Unlike successful but that scream doesn't exist any more." })
            } else {
                screamData.likeCount--
                return db.doc(`/screams/${screamId}`).update({ likeCount: screamData.likeCount })
            }
        })
        .then((_writeresult) => {
            screamData.screamId = screamId
            return response.status(200).json(screamData)
        })
        .catch((err) => {
            console.log(err)
            return response.status(500).json({ error: "Something went wrong." })
        })
}

exports.deleteScream = (request, response) => {
    const screamId = request.params.screamId
    db.doc(`/screams/${screamId}`)
        .get()
        .then((doc) => {
            if (!doc.exists) {
                //return response.status(404).json({ status: "That scream doesn't exist." })
                return Promise.reject(`Scream with ID ${screamId} doesn't exist.`)
            }
            const ownerOfTheScream = doc.data().userHandle
            if (ownerOfTheScream !== request.user.handle) {
                //return response.status(403).json({ error: "You can't delete other people's screams." })
                return Promise.reject("You can't delete other people's screams.")
            } else {
                return doc.ref.delete()
            }
        })
        .then((_writeResult) => {
            return response.status(200).json({ message: "Successfully deleted the scream" })
        })
        .catch((err) => {
            console.log(err)
            return response.status(500).json({ error: err })
        })
}

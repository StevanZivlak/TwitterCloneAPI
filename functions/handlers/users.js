const { admin, db } = require("../util/admin")

const config = require("../util/config")

const firebase = require("firebase")
firebase.initializeApp(config)

const { validateSignupData, validateLoginData, reduceUserDetails } = require("../util/validators")
const { response } = require("express")
/**Sign up as a new user */
exports.signup = (request, response) => {
    const newUser = {
        email: request.body.email,
        password: request.body.password,
        confirmPassword: request.body.confirmPassword,
        handle: request.body.handle
    }

    const { valid, errors } = validateSignupData(newUser)
    if (!valid) return response.status(400).json(errors)

    const noImg = "no-img.png"

    let tokenVar, userId
    db.doc(`/users/${newUser.handle}`)
        .get()
        .then((user) => {
            if (user.exists) {
                return response.status(400).json({ handle: "This handle is already taken" })
            } else {
                return firebase
                    .auth()
                    .createUserWithEmailAndPassword(newUser.email, newUser.password)
            }
        })
        .then((data) => {
            userId = data.user.uid
            return data.user.getIdToken()
        })
        .then((token) => {
            tokenVar = token
            const userCredentials = {
                handle: newUser.handle,
                email: newUser.email,
                createdAt: new Date().toISOString(),
                imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
                userId: userId
            }
            return db.doc(`/users/${newUser.handle}`).set(userCredentials)
        })
        .then(() => {
            return response.status(201).json({ token: tokenVar })
        })
        .catch((error) => {
            console.error(error)
            if (error.code === "auth/email-already-in-use") {
                return response.status(400).json({ email: "Email is already in use" })
            } else {
                return response
                    .status(500)
                    .json({ general: "Something went wrong. Please try again." })
            }
        })
}
/**Log the user in */
exports.login = (request, response) => {
    const user = {
        email: request.body.email,
        password: request.body.password
    }

    const { valid, errors } = validateLoginData(user)
    if (!valid) return response.status(400).json(errors)

    firebase
        .auth()
        .signInWithEmailAndPassword(user.email, user.password)
        .then((data) => {
            return data.user.getIdToken()
        })
        .then((token) => {
            return response.json({ token })
        })
        .catch((error) => {
            console.error(error)
            return response.status(403).json({ general: "Wrong credentials, please try again." })
        })
}
/**Upload a new profile image */
exports.uploadImage = (request, response) => {
    const BusBoy = require("busboy")
    const path = require("path")
    const os = require("os")
    const fs = require("fs")

    const busboy = new BusBoy({ headers: request.headers })

    let imageFileName
    let imageToBeUploaded = {}

    busboy.on("file", (_fieldname, file, filename, _encoding, mimetype) => {
        if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
            return response.status(400).json({ error: "Wrong file type submitted." })
        }
        const splitArray = filename.split(".")
        const imageExtension = splitArray[splitArray.length - 1]
        imageFileName = `${Math.round(Math.random() * 100000000000)}.${imageExtension}`
        const filePath = path.join(os.tmpdir(), imageFileName)
        imageToBeUploaded = { filePath, mimetype }
        file.pipe(fs.createWriteStream(filePath)) //creates a file in the temp folder with a random name
    })
    busboy.on("finish", () => {
        //uploads the created file to the data store
        console.log(imageToBeUploaded.filePath)
        admin
            .storage()
            .bucket()
            .upload(imageToBeUploaded.filePath, { resumable: false })
            .then(() => {
                const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`
                return db.doc(`/users/${request.user.handle}`).update({ imageUrl })
            })
            .then(() => {
                return response.json({
                    message: "Image uploaded successfully."
                })
            })
            .catch((error) => {
                console.error(error)
                return response.status(500).json({ error: error.code })
            })
    })
    busboy.end(request.rawBody)
}
/**Add user details */
exports.addUserDetails = (request, response) => {
    let userDetails = reduceUserDetails(request.body)
    db.doc(`/users/${request.user.handle}`)
        .update(userDetails)
        .then(() => {
            return response.json({ message: "Successfully updated user details." })
        })
        .catch((error) => {
            console.log(error)
            return response.status(500).json({ error: error.code })
        })
}
/**Get own user details */
exports.getAuthenticatedUser = (request, response) => {
    let userData = {}
    db.doc(`/users/${request.user.handle}`)
        .get()
        .then((doc) => {
            if (doc.exists) {
                userData.credentials = doc.data()
                return db.collection("likes").where("userHandle", "==", request.user.handle).get()
            } else {
                return Promise.reject("That user doesn't exist.") //this can't really happen cos of middle-ware. he's already logged in.
            }
        })
        .then((data) => {
            userData.likes = []
            data.forEach((doc) => {
                userData.likes = [...userData.likes, doc.data()]
            })
            return db
                .collection("notifications")
                .where("recipient", "==", request.user.handle)
                .orderBy("createdAt", "desc")
                .limit(10)
                .get()
        })
        .then((usersNotifications) => {
            userData.notifications = []
            usersNotifications.forEach((notification) => {
                userData.notifications = [
                    ...userData.notifications,
                    {
                        ...notification.data(),
                        notificationId: notification.id
                    }
                ]
            })
            return response.json(userData)
        })
        .catch((error) => {
            console.error(error)
            return response.status(500).json({ error: error.code })
        })
}
/** Gets any user's details */
exports.getUserDetails = (request, response) => {
    let userData = {}
    db.doc(`/users/${request.params.handle}`)
        .get()
        .then((userDoc) => {
            if (!userDoc.exists) {
                return Promise.reject("User with that handle doesn't exist.")
            }
            userData.user = userDoc.data()
            return db
                .collection("screams")
                .where("userHandle", "==", request.params.handle)
                .orderBy("createdAt", "desc")
                .get()
        })
        .then((screamsTheyPosted) => {
            userData.screams = []
            screamsTheyPosted.forEach((scream) => {
                userData.screams.push({
                    ...scream.data(),
                    screamId: scream.id
                })
            })
            return response.status(200).json(userData)
        })
        .catch((err) => {
            console.log(err)
            return response.status(500).json({ error: err.code })
        })
}
/** Marks the notifications as read according the the notificationId array received */
exports.markNotificationsRead = (request, response) => {
    let batch = db.batch()
    request.body.forEach((notificationId) => {
        const notification = db.doc(`/notifications/${notificationId}`)
        batch.update(notification, { read: true })
    })
    batch
        .commit()
        .then((_writeResult) => {
            return response.json({ message: "Notifications marked read." })
        })
        .catch((err) => {
            console.log(err)
            return response.status(500).json({ error: err.code })
        })
}

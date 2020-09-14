let db = {
    users: [
        {
            userId: "gegreg",
            email: "user@gmail.com",
            handle: "username",
            createdAt: "some date in iso format",
            imageUrl: "image/ewfwef.jpg",
            bio: "the story of my life",
            website: "someValiUrlForTheUsersWebsite.com",
            location: "Novi Sad, Serbia"
        }
    ],
    screams: [
        {
            userHandle: "user",
            imageUrl: "www.google.com/image.png",
            body: "this is the scream body",
            createdAt: "2020-08-03T09:32:35.651Z",
            likeCount: 5,
            commentCount: 2
        }
    ],
    comments: [
        {
            userHandle: "user",
            screamId: "fewfwefwef",
            body: "nice one mate!",
            createAt: "2020-08-03T09:32:35.651Z"
        }
    ],
    notifications: [
        {
            recipient: "user",
            sender: "john",
            read: "true | false",
            screamId: "dwqefwefwefw",
            type: "like | comment",
            createdAt: "2020-08-03T09:32:35.651Z"
        }
    ]
}

const userDetails = {
    //redux
    credentials: {
        userId: "gegreg",
        email: "user@gmail.com",
        handle: "username",
        createdAt: "some date in iso format",
        imageUrl: "image/ewfwef.jpg",
        bio: "the story of my life",
        website: "someValiUrlForTheUsersWebsite.com",
        location: "Novi Sad, Serbia"
    },
    likes: [
        {
            userHandle: "user",
            screamId: "f43g43g43g43"
        },
        {
            userHandle: "user",
            screamId: "f43g43g43g43"
        }
    ]
}

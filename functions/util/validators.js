const { user } = require("firebase-functions/lib/providers/auth")

const isEmail = (email) => {
    const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    if (email.match(regEx)) return true
    else return false
}

const isEmpty = (string) => {
    if (string.trim() === "") return true
    else return false
}

exports.validateSignupData = (data) => {
    let errors = {}

    if (isEmpty(data.email)) {
        errors.email = "Must not be empty."
    } else if (!isEmail(data.email)) {
        errors.email = "Must be a valid email address."
    }

    if (isEmpty(data.handle)) {
        errors.handle = "Must not be empty."
    }
    //password checks
    if (isEmpty(data.password) || isEmpty(data.confirmPassword)) {
        if (isEmpty(data.password)) errors.password = "Must not be empty."
        if (isEmpty(data.confirmPassword)) errors.confirmPassword = "Must not be empty."
    } else if (data.password.length < 6 || data.confirmPassword.length < 6) {
        if (data.password.length < 6) errors.password = "Must be at least 6 characters long."
        if (data.confirmPassword.length < 6)
            errors.confirmPassword = "Must be at least 6 characters long."
    } else {
        if (data.password !== data.confirmPassword) errors.confirmPassword = "Passwords must match."
    }

    return {
        errors,
        valid: Object.keys(errors).length === 0 ? true : false
    }
}

exports.validateLoginData = (data) => {
    let errors = {}

    if (isEmpty(data.email)) errors.email = "Must not be empty."
    else if (!isEmail(data.email)) errors.email = "Must be a valid email address."
    if (isEmpty(data.password)) errors.password = "Must not be empty."

    return {
        errors,
        valid: Object.keys(errors).length === 0 ? true : false
    }
}

exports.reduceUserDetails = (data) => {
    let userDetails = {}
    if (!isEmpty(data.bio)) userDetails.bio = data.bio
    const trimmedWebsite = data.website.trim()
    if (!isEmpty(trimmedWebsite)) {
        if (trimmedWebsite.substring(0, 4) !== "http") {
            userDetails.website = `http://${trimmedWebsite}`
        } else {
            userDetails.website = trimmedWebsite
        }
    }
    if (!isEmpty(data.location)) userDetails.location = data.location

    return userDetails
}

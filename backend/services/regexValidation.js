const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
    return typeof email === 'string' && emailRegex.test(email)
}

// At least 6 characters with a letter and a number (symbols allowed)
const isValidPassword = (password) => {
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/
    return typeof password === 'string' && passwordRegex.test(password)
}

module.exports = { isValidEmail, isValidPassword }

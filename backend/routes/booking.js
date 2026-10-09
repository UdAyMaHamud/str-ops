const express = require('express')
const { createBooking, getMyBookings, cancelBooking, reviewBooking, getBookingRequests, decideBooking } = require('../controllers/bookingController')
const { toggleWishlist, getMyWishlist } = require('../controllers/wishlistController')
const roleCheck = require('../middleware/roleCheckMiddleware')

const route = express.Router()

// ====== Guest Routes
route.post('/create', roleCheck('guest'), createBooking)
route.get('/my', roleCheck('guest'), getMyBookings)
route.put('/:id/cancel', roleCheck('guest'), cancelBooking)
route.post('/:id/review', roleCheck('guest'), reviewBooking)
route.post('/wishlist', roleCheck('guest'), toggleWishlist)
route.get('/wishlist', roleCheck('guest'), getMyWishlist)

// ====== Staff Routes
route.get('/requests', roleCheck('trainee', 'senior', 'admin'), getBookingRequests)
route.patch('/:id/decide', roleCheck('senior', 'admin'), decideBooking)

module.exports = route

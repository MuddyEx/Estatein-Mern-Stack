const mongoose = require('mongoose');

const apartmentSchema = new mongoose.Schema({
  agentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Agent', 
    required: [true, 'Agent ID is required'] 
  },
  title: { 
    type: String, 
    required: [true, 'Title is required'], 
    trim: true, // Remove leading/trailing whitespace
    minlength: [3, 'Title must be at least 3 characters long'] 
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'declined'],
    default: 'pending'
  },
  location: { 
    type: String, 
    required: [true, 'Location is required'], 
    trim: true 
  },
  images: [{ 
    type: String, 
    validate: {
      validator: (array) => array.length > 0,
      message: 'At least one image is required'
    }
  }],
  video: { 
    type: String, 
    default: '' 
  },
  pricePerDay: { 
    type: Number, 
    required: [true, 'Price per day is required'], 
    min: [1, 'Price must be at least 1 Naira'] 
  },
  address: { 
    type: String, 
    required: [true, 'Address is required'], 
    trim: true 
  },
  state: { 
    type: String, 
    required: [true, 'State is required'], 
    trim: true 
  },
  totalRooms: { 
    type: Number, 
    required: [true, 'Total rooms is required'], 
    min: [1, 'Must have at least 1 room'] 
  },
  parkingSpace: { 
    type: Boolean, 
    default: false 
  },
  propertyType: { 
    type: String, 
    required: [true, 'Property type is required'], 
    enum: {
      values: ['Single Room', '2-Bedroom', 'Duplex', 'Studio'],
      message: 'Invalid property type'
    }
  },
  facilities: { 
    type: String, 
    required: [true, 'Facilities are required'], 
    trim: true 
  },
  partiesAllowed: { 
    type: Boolean, 
    default: false 
  },
  description: { 
    type: String, 
    required: [true, 'Description is required'], 
    trim: true 
  },
  availability: { 
    type: String, 
    default: 'Available', 
    enum: {
      values: ['Available', 'Unavailable'],
      message: 'Invalid availability status'
    }
  },
  rentedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    default: null 
  },
  
}, { timestamps: true });

// Ensure indexes for faster queries
apartmentSchema.index({ agentId: 1 });
apartmentSchema.index({ title: 'text', location: 'text' }); // For search functionality

const Apartment = mongoose.model('Apartment', apartmentSchema);
console.log('Apartment model created');
module.exports = Apartment;
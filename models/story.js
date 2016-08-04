var mongoose = require('mongoose');

var storySchema = mongoose.Schema({
    shortID: {
        type: String,
        required: true,
        index: {
            unique: true
        }
    },
    parent: {
        type: String,
        required: true,
        index: {
            unique: false
        }
    },
    author: {
        type: String,
        required: true,
        index: {
            unique: false
        }
    },

    content: {
        type: String,
        required: true,
        index: {
            unique: false
        }
    },

    createdat: {
        type: Date,
        required: true,
        default: Date.now
    },
    changedat: {
        type: Date,
        required: true,
    },
    views: {
		type: Number,
		required: true,
		default: 0
    }
});

var Story = mongoose.model('Story', storySchema);

module.exports = Story;

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
            unique: true
        }
    },
    author: {
        type: String,
        required: true,
        index: {
            unique: true
        }
    },

    content: {
        type: String,
        required: true,
        index: {
            unique: true
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
    }
});

var Story = mongoose.model('Story', storySchema);

module.exports = Story;

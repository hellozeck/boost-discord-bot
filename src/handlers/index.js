const postXHandler = require('./postXHandler');
const gmHandler = require('./gmHandler');
const feedbackHandler = require('./feedbackHandler');

module.exports = {
    'post-x': postXHandler,
    'gm': gmHandler,
    'feedback': feedbackHandler
}; 
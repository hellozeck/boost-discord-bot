const postXHandler = require('./postXHandler');
const gmHandler = require('./gmHandler');
const feedbackHandler = require('./feedbackHandler');

module.exports = {
    'postX': postXHandler,
    'gm': gmHandler,
    'feedback': feedbackHandler
}; 
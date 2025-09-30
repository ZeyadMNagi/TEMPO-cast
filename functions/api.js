// This file acts as the entry point for the Netlify Function.
// It simply imports and exports the handler from your main server file.
const server = require("../server.js");
module.exports.handler = server.handler;
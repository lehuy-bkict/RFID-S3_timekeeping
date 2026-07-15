'use strict'

const {app, server} = require("./app");

const PORT = process.env.SERVER_PORT
server.listen(PORT, () => {
    console.log(`listening on *:${PORT}`);
});

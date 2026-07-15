'use strict'

const mongoose = require('mongoose')

class Database {
    constructor(){
        this.connect()
        // this.con
        // this.db
    }
    //Connect
    connect(type = 'mongodb') {
        mongoose.connect(`mongodb://${process.env.DATABASE_HOST}/${process.env.DATABASE_QUERY}?retryWrites=true&w=majority`).then(_ => {
            console.log('Connected Mongodb Success')
        });
        // this.con = mongoose.createConnection(process.env.API_HOST);

        // this.con.on("error", function(err){
        //     console.log("Mongoose connection error: " + err);
        //     return
        // });
        // this.con.on("disconnected", function(){
        //     return
        // });
        
        process.on('unhandledRejection', function (err) {
            if ('MongoError' === err.name) {
                console.log('unhandledRejection: ' + err.message);
                return
            }
            return
        });
        // this.db = this.con.useDb(`${process.env.DATABASE}`);
    }
    // instance
    static getInstance() {
        if(!Database.instance){
            Database.instance = new Database()
        }
        return Database.instance
    }
}
module.exports = Database.getInstance()
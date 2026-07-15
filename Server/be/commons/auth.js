'use strict'

let jwt = require('../jwt/JwtManager')
let cache = require('../jwt/cache')
let CONST = require('../Constants/consts')

module.exports = async (req, res, next) => {
    // Lấy token từ header 
    var token = req.headers.authorization
    if (!token) {
        return await res.status(403).send({
          result: CONST.TOKEN_MISSING,
          msg: "Token missing"
        })
    }
+
    // Verify token
    await jwt.verifyToken(token).then((success) => {
        cache.checkCache("000007_" + success.id).then((resp) => {
            if (!resp){
                return res.status(401).send({
                    result: CONST.TOKEN_INVALID,
                    msg: "Token invalid"
                })
            }
            else {
                cache.getCache("000007_" + success.id).then((saveCache) =>{
                    saveCache = JSON.parse(saveCache)
    
                    if (saveCache.Token != token){
                        return res.status(401).send({
                            result: CONST.TOKEN_EXPIRED,
                            msg: "Token Expired"
                        })
                    }
                    else {
                        next()
                    }
                })
            }
        })
        
    }, (fail) => {
        console.log("Lỗi ngoại lệ: " + fail)
        return res.status(401).send({
            result: CONST.EXCEPTION,
            msg: "Token không đúng định dạng"
        })
    })
}
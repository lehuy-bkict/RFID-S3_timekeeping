'use strict'

module.exports.StatusCode = {
    // Mã lỗi api
    SUCCESS: 200 ,
    UNAUTHORIZED : 401 ,
    NOTFOUND : 404  ,
    ERROR : 500  
}
module.exports.ParkingConstants = {
    // lỗi ngoại lệ
    ERROR : 0,  
    // Thành công
    SUCCESS: 1,
    // Không thành công
    FAIL: -1,
    ///
    VALIDATE: 2
    ///
}

module.exports.Message = {
    // Mã lỗi api
    ERROR : "lỗi ngoại lệ",
    SUCCESS: "Thành công" ,
    FAIL : "Không thành công"  ,
    VALIDATE : "Dữ liệu đầu vào không đúng"  ,

}
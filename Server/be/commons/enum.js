'use strict'

///
// Enum Validate
module.exports = {

    /** 0 - LỖi */
    ERROR: 0, 
    
    /** 1 - Thành công */
    SUCCESS : {
        Msg: 'Thành công',
        Code: 1
    },

    /** 2 - Đã tồn tại */
    ISVALIDATE : 2, 

    /** 3 - Dữ liệu sai định dạng */
    FORMAT : 3, 

    /** 4 - Dữ liệu bị NUll */
    NULL : 4 ,

    /** 9 - Biển số đã tồn tại */
    ISVALIDATELicencePlate : 9, 

    /** 7 - Thẻ đã tồn tại */
    ISVALIDATECARD : 7, 
    
    /** 8 - Thẻ bị NUll */
    NULLCARD : 8 ,

    /** 10 - Biển số đã tồn tại */
    ISVALIDATEPhoneNumber : 10, 


    // tổng số document
    DOCUMENTCOUNT : 2500,
    // tổng số document 9990
    DOCUMENTCOUNT_MAX : 9990,
    // số bản ghi trong 1 document
    ITEMCOUNT : 15
}   
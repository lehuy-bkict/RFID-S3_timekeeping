'use strict'

let enumV1 = require('../commons/enum')

//Kiểm tra sự kiện thêm mới
module.exports.CreatNew = (data) => {

    //Khởi tạo giá trị
    let msg = '';
    let result = enumV1.ERROR;

    if(data != null) {msg = "Thành công";result = enumV1.SUCCESS}
    else{msg = "Lỗi ngoại lệ";result = enumV1.ERROR}

    // kết quả trả ra
    return {
        msg: msg,
        result: result
    }
}
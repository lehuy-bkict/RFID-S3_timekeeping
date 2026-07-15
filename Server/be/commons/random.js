'use strict'


/**random 8 kí tự ngẫu nhiên cả chữ và số */
module.exports.random8Text = () => {

    //Khởi tạo giá trị
    let string = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let length = 8
    let result = '';
    for (let i = length; i > 0; --i) result += string[Math.round(Math.random() * (string.length - 1))];

    // kết quả trả ra
    return result;
}

/**Ramdom 6  số ngẫu nhiên */
module.exports.random6Number = () => {

    //Khởi tạo giá trị
    let string = '0123456789';
    let length = 6
    let result = '';
    for (let i = length; i > 0; --i) result += string[Math.round(Math.random() * (string.length - 1))];

    // kết quả trả ra
    return result;
}

/**Lấy chuỗi tháng năm theo thời gian thực */
module.exports.randomNumberMontYear = () => {

    //Khởi tạo giá trị
    let result = '';
    result = '0' + (new Date().getMonth() + 1).toString().slice(-2) + new Date().getFullYear().toString();

    // kết quả trả ra
    return result;
}
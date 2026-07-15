'use strict'

//chuyển đổi số yyyy mm dd thành chuỗi yyyymmdd
module.exports.ObjectDate = (object) => {
    
    let stringDate = "";
    let day = object.day < 10 ? '0' + object.day.toString() : object.day.toString();
    let month = object.month < 10 ? '0' + object.month.toString() : object.month.toString();
    let year = object.year.toString() ;
    
    stringDate = year + month + day;
    // kết quả trả ra
    return stringDate 
}
module.exports.ConvertDate = (object) => {
    
    let date = new Date(object.year, object.month - 1, object.day);

    // kết quả trả ra
    return date.toISOString();
}
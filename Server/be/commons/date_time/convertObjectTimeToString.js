//chuyển đổi object thời gian thành string
module.exports.convertObjectTimeToString = (data) => {

    //Khởi tạo giá trị
    let hour = data.hour < 10 ? '0' + data.hour : data.hour;
    let minute = data.minute < 10 ? '0' + data.minute : data.minute;
    let second = data.second < 10 ? '0' + data.second : data.second;

    let stringDate = hour.toString() + ':' + minute.toString() + ':' + second.toString()
   
    // kết quả trả ra
    return stringDate;
}
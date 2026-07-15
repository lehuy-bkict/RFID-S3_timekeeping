//chuyển đổi object thời gian thành string
module.exports.convertStringTimeToObject = (stringDateTime) => {

    //Khởi tạo giá trị
    let hour = stringDateTime != "" ? stringDateTime.slice(0, 2) : "00";
    let minute = stringDateTime != "" ? stringDateTime.slice(3, 5) : "00";
    let second = stringDateTime != "" ? stringDateTime.slice(6, 8) : "00";

    let objectTime = {
        hour: Number(hour), 
        minute: Number(minute), 
        second: Number(second)
    };
   
    // kết quả trả ra
    return objectTime;
}
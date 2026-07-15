module.exports.dateformatddMMyy = (date) => {

    //Khởi tạo giá trị
    let str = date.toISOString().split('T')[0]

    let stringDate = str.split('-')[2] + '/' + str.split('-')[1] + '/' + str.split('-')[0]
   
    // kết quả trả ra
    return stringDate;
}
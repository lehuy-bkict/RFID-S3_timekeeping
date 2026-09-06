'use strict';

module.exports.StatusCode = {
    SUCCESS: 200,
    UNAUTHORIZED: 401,
    NOTFOUND: 404,
    ERROR: 500
};

const AttendanceConstants = {
    ERROR: 0,
    SUCCESS: 1,
    FAIL: -1,
    VALIDATE: 2
};

module.exports.AttendanceConstants = AttendanceConstants;
module.exports.ParkingConstants = AttendanceConstants;

module.exports.Message = {
    ERROR: "System error",
    SUCCESS: "Success",
    FAIL: "Failed",
    VALIDATE: "Invalid input data"
};
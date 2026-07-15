'use strict';

const { client } = require('../base_connects/base_mqtt/init.mqtt');
const { CheckInEventService } = require('./services/checkinout.service');
const {Types} = require('mongoose')

client.on('message', async (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    const { rfid, timestamp, device } = data;
    // Validate incoming data
    if (!rfid || !timestamp || !device) {
      console.error('Invalid data received:', data);
      return;
    }
    
    var existing;
    try {
      var query = { cardNumber: rfid, ispass: false };
      existing = await CheckInEventService.getby(query);

      if (!existing || !Array.isArray(existing)) {
        console.warn(`Unexpected result or no records found for RFID=${rfid}`);
        existing = [];
      }
    } catch (error) {
      console.error(`Error fetching records for RFID=${rfid}:`, error.message);
      return;
    }

    if (existing && existing.length > 0) {
      const result = await CheckInEventService.Update(
        { _id: new Types.ObjectId(existing[0]._id) },
        {
          $set: {
            'info.CheckOut': new Date(timestamp),
            ispass: true
          }
        }
      );
    } else {
      let newDoc = {
        _id: new Types.ObjectId(),
        cardNumber: rfid,
        ispass: false,
        deviceID: device,
        info: {
          CheckIn: new Date(timestamp), 
          CheckOut: null
        },
        CreateTime: new Date() 
      };
      const inserted = await CheckInEventService.Insert(newDoc);
    }

  } catch (error) {
    console.error('Error processing message:', error.message);
  }
});

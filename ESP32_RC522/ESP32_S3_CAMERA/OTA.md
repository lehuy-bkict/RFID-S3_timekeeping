# OTA firmware updates

The firmware exposes ArduinoOTA as `esp32-rfid-cam.local` after it connects to
Wi-Fi. The ESP32-S3-DevKitC-1 8 MB partition scheme includes two OTA app slots;
the current firmware fits in either slot.

Set a private password of at least 12 characters in the PowerShell session used
to build and upload. The password is not stored in the repository:

```powershell
$env:OTA_PASSWORD = Read-Host "Enter a private OTA password"
```

## First installation or recovery over USB

Replace `COMx` with the ESP32's serial port:

```powershell
platformio run -d "D:\Hust_PhD\Subject\IoT\ESP32-S3_timekeeping\ESP32_RC522\PlatformIO" -e esp32-s3-devkitc-1-usb -t upload --upload-port COMx
```

After Wi-Fi connects, the Serial Monitor reports the device IP and that OTA is
ready. Keep the same `OTA_PASSWORD` for later uploads.

## Upload over Wi-Fi

Connect the laptop and ESP32 to the same LAN, then run:

```powershell
platformio run -d "D:\Hust_PhD\Subject\IoT\ESP32-S3_timekeeping\ESP32_RC522\PlatformIO" -e esp32-s3-devkitc-1 -t upload
```

If mDNS does not resolve `esp32-rfid-cam.local`, pass the IP printed by the
Serial Monitor:

```powershell
platformio run -d "D:\Hust_PhD\Subject\IoT\ESP32-S3_timekeeping\ESP32_RC522\PlatformIO" -e esp32-s3-devkitc-1 -t upload --upload-port <ESP32-IP>
```

The first OTA-capable firmware must be installed over USB. OTA requires the
ESP32 and laptop to reach each other on the LAN; do not expose the OTA service
to the public Internet.

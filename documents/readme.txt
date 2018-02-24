-- run all as root because of permissions
sudo su

* run bluetooth in compatible mode
sudo nano /etc/systemd/system/dbus-org.bluez.service
- add --compat option to bluetoothd
  ExecStart=/usr/lib/bluetooth/bluetoothd --compat

-- install 
 sudo su
 npm install --unsafe-perm
 
-- install serialport
npm i -g serialport --unsafe-perm

-- could not locate the binding file error for serialport
rebuild as root:
sudo su
sudo npm rebuild

-- run node-on-android - notice current folder
root@debianvb:/home/debian/apk# node-on-android /home/debian/bms -o bmsapp.apk -b /home/debian/android/tools/


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

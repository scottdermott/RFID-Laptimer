__author__ = "Scott Dermott"
__credits__ = ["Scott Dermott", "Tim Shipp"]
__license__ = "General Public License v3.0"
__version__ = "1.0.0"
__maintainer__ = "Scott Dermott"
__email__ = "scott@sd-media.co.uk"
__status__ = "Testing"

import serial
import io
import pymongo
import time
from datetime import datetime
import fcntl, sys

serialport = serial.Serial(
	port='/dev/ttyUSB0',\
	baudrate=9600,\
	# parity=serial.PARITY_NONE,\
	# stopbits=serial.STOPBITS_ONE,\
	# bytesize=serial.EIGHTBITS,\
	timeout=0,\
	# xonxoff=False,\
	# rtscts=False,\
	# dsrdtr=False
)
lap_in_progress = {}
mongodb = pymongo.MongoClient("mongodb://localhost:27017/")
db = mongodb["py-laptimer"]
lapData = db["lapData"]

pid_file = 'laptimer.pid'
fp = open(pid_file, 'w')
try:
    fcntl.lockf(fp, fcntl.LOCK_EX | fcntl.LOCK_NB)
except IOError:
    # another instance is running
    print("Another instance of scoder-laptimer is already running")
    sys.exit(0)

class ReadLine:
    def __init__(self, s):
        self.buf = bytearray()
        self.s = s

    def readline(self):
        i = self.buf.find(b"\n")
        if i >= 0:
            r = self.buf[:i+1]
            self.buf = self.buf[i+1:]
            return r
        while True:
            i = max(1, min(2048, self.s.in_waiting))
            data = self.s.read(i)
            i = data.find(b"\n")
            if i >= 0:
                r = self.buf + data[:i+1]
                self.buf[0:] = data[i+1:]
                return r
            else:
                self.buf.extend(data)

def saveLap(rfid, lap_time):
	lapData.update({'rfid': rfid}, {'$push': {'laps': lap_time}}, upsert=True)

rl = ReadLine(serialport)
# Test Data
#lapData.update({'rfid': '777'},{'$push': {'laps': 776666}}, upsert=True)

while True: 
	rfid_tag = rl.readline()
	rfid = rfid_tag.decode()
	rfid = rfid.replace("\x03","").replace("\x02","")
	rfid = rfid.strip()
	#print(repr(rfid))
	dt = datetime.now()
	# Don't save the data with 10 seconds of last read for the same RFID
	no_re_read = 10000
	if len(rfid) > 1:
		milli_sec = int(round(time.time() * 1000))
		if rfid in lap_in_progress:
			if milli_sec > lap_in_progress[rfid]+no_re_read:
				lap_time = milli_sec - lap_in_progress[rfid]
				lap_in_progress[rfid] = milli_sec
				print("Lap complete : %s Milliseconds", lap_time)
				saveLap(rfid,lap_time)
		else:
			print("Starting first lap")
			lap_in_progress[rfid] = milli_sec

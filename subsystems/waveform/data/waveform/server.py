
#from twisted.internet.defer import inlineCallbacks

#from autobahn.twisted.util import sleep
#from autobahn.twisted.wamp import ApplicationSession
#from autobahn.wamp.exception import ApplicationError

from twisted.python import log
from twisted.internet import reactor

import numpy
#import json
import pdb
import wf
import sys
from save_waveform import *


from autobahn.twisted.websocket import WebSocketServerProtocol, \
    WebSocketServerFactory
    
    
    
##########
# DataBase
##########
dbURL = "http://127.0.0.1:5984"
user = ""
pwd = ""

###########
# Server
###########
wsuri = "ws://localhost:9000"




class WSServerProtocol(WebSocketServerProtocol):

    def onConnect(self, request):
        print("Client connecting: {0}".format(request.peer))

    def onOpen(self):
        print("WebSocket connection open.")

    def onMessage(self, payload, isBinary):
    	if(isBinary == True):
    		print("Error: binary Data received")
    		return
    		
    		
    	print("Text message received: {}".format(payload))
    	hdr = json.loads(payload)
    	
    	cmd = hdr[0]
    	if(cmd == "get NamesList"):
    		print cmd
    		self.updateList()
    	if(cmd == "get Waveform"):
    		print cmd, hdr[1]
    		self.load_data(hdr[1])
    	if(cmd == "send Waveform"):
    		print cmd, hdr[1]
    		success = self.send_DBdata_to_wfGenerator(hdr[1])	
    		if(success):
    			self.sendMessage(self.buildHeader(["Sending Success"]), False)
    		else:
    			self.sendMessage(self.buildHeader(["Sending Failure"]), False)    			
    	if(cmd == "delete Waveform"):
    		print cmd, hdr[1]
    		self.deleteDoc(hdr[1])    	
    		self.updateList()
    	if(cmd == "save Waveform"):
    		print cmd, hdr[1], hdr[2]
    		name = hdr[1]
    		hdr = hdr[2]
    		success = self.save_data(name, hdr[0], hdr[1], hdr[2], hdr[3], hdr[4], hdr[5])
    		if(success):
    			self.updateList()
    			self.sendMessage(self.buildHeader(["Draw", name]), False)
    		else:
    			self.sendMessage(self.buildHeader(["Info", "Document could not be saved: ValueError"]), False)
    	if(cmd == "send CustomWF"):
    		print cmd, hdr[1]
    		hdr = hdr[1]
    		success = self.send_data_to_wfGenerator(hdr[0], hdr[1], hdr[2], hdr[3], hdr[4], hdr[5])
    		if(success):
    			self.sendMessage(self.buildHeader(["Sending Success"]), False)
    		else:
    			self.sendMessage(self.buildHeader(["Sending Failure"]), False) 
    

    def onClose(self, wasClean, code, reason):
        print("WebSocket connection closed: {0}".format(reason))
        
    def buildHeader(self, header, isBinary=False):
    	header = json.dumps(header)
    	
    	if(isBinary):
    		x = numpy.array([len(header)], dtype=numpy.int32).tostring() + header
    		print len(header), header
    		return x
    	else:
    		return str(numpy.int32(len(header))) + ":" + header
    	
    def save_data(self, name, b0, f_burst_t, sampling_f, s, measuring_t, l):
    	db = self.getDB()
    	try:
    		data = db.saveWF(name, float(b0), float(f_burst_t), int(sampling_f), float(s), float(measuring_t), int(l))
    		self.sendDataToDraw(data, int(sampling_f))
    		print("Data saved to DB")
    		return True
    	except Exception as e:
    		print(e)
    		return False
    
    def load_data(self, name):
    	db = self.getDB()
    	data = db.read(name)
    	print("Data '" + name + "' loaded: {}".format(data))
    	samplingFreq = 0; #try loading samplingFreq from Doc, else assume 100khz
    	try:
    		samplingFreq = db.readOutSamplingFreq(name)
    		print("SamplingFrequency loaded: {}".format(samplingFreq))
    	except:
    		samplingFreq = 100000
    		print("SamplingFrequency not saved. Set to: {}".format(samplingFreq))
    	
    	#send less data if more than 1e6 data points
    	if(len(data) > 1000000):
    		divisor = int(len(data) / 1000000) + 1
    		print("Data reduction, divisor: ", divisor)
    		newLen = int(len(data) / divisor)
    		newData = numpy.array(xrange(newLen), dtype = numpy.float64)
    		i = 0
    		while i<newLen:
    			newData[i] = data[i * divisor]
    			i+= 1
    			
    		print("Data reduction from: ", len(data), " to ", newLen)
    		data = newData
    	
    	
    	self.sendDataToDraw(data, samplingFreq)
    
    def send_data_to_wfGenerator(self, b0, f_burst_t, measuring_t, s, sampling_f, l):
    	try:
    		#print b0, f_burst_t, sampling_f, s, measuring_t, l
    		data = wf.startWFParams(float(b0), float(f_burst_t), float(measuring_t), float(s), int(sampling_f), int(l))
    		self.sendDataToDraw(data, int(sampling_f))
    		return True
    	except ValueError as e:
    		print(e)
    	except:
    		print(sys.exc_info()[0])
    	return False
    
    def getDB(self):
    	return WaveformDB(dbURL, user, pwd)
    
    def sendDataToDraw(self, data, samplingFreq):
    	binaryData = data.tostring()
    	print(type(samplingFreq),samplingFreq)
    	self.sendMessage(self.buildHeader(["Waveform", str(samplingFreq)], True) + data.tostring(), True)
    	print("send data to Browser for Drawing")
    	print(type(data.tolist()), type(data.tolist()[0]))
    	
    def updateList(self):
    	db = self.getDB()
    	namesList = db.getnames()
    	print("Sending NamesList")
    	self.sendMessage(self.buildHeader(["NamesList", namesList]), False)
    	
    def send_DBdata_to_wfGenerator(self, name):
    	db = self.getDB()
    	data = db.read(name)
    	totalVolts = db.readOutTotalVolts(name)
    	
    	samplingFreq = 0; #try loading samplingFreq from Doc, else assume 100khz
    	try:
    		samplingFreq = db.readOutSamplingFreq(name)
    		print("SamplingFrequency loaded: {}".format(samplingFreq))
    	except:
    		samplingFreq = 100000
    		print("SamplingFrequency not saved. Set to: {}".format(samplingFreq))
    	
    	samplingFreq = str(int(samplingFreq / 1000)) + "kHz"
    	
    	try:
    		wf.startWithData(data, totalVolts, samplingFreq)
    		print("Data sent to Waveform Generator")
    		return True
    	except ValueError as e:
    		print (e)
    	except:
    		print(sys.exc_info()[0])
    	return False
    
    def deleteDoc(self, name):
    	db = self.getDB()
    	if(db.existName(name) == False):
    		print("Doc not deleted, name doesn't exist")
    	else:
    		db.deleteDocument(name)
    		print("Doc deleted")


if __name__ == '__main__':
    log.startLogging(sys.stdout)

    factory = WebSocketServerFactory(wsuri, debug=False)
    factory.protocol = WSServerProtocol
    # factory.setProtocolOptions(maxConnections=2)

    reactor.listenTCP(9000, factory)
    reactor.run()
            


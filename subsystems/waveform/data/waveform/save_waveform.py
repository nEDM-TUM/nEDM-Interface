import cloudant
import json
import numpy

from wf import *

class WaveformDB:
	def __init__(self, url, _un, _pwd):
		acct = cloudant.Account(uri=url)
		acct.login(_un, _pwd)
		self.acct = acct
		_db = "nedm%2Fwaveform"
		db = acct[_db]
		self.db = db
		
	def showresults(self):
		doctype="document_type"
		des = self.db.design(doctype)
		the_view = des.view(doctype)
		
		results = the_view.get(params = dict(
			endkey = ['waveform',{}], 
			startkey = ['waveform'], 
			reduce = False, 
			include_docs = True
		)).json()
		
		return results
	
	def getnames(self):
		results = self.showresults()
		names = list()
		for i in results['rows']:
			names.append(i['doc']['name'])
		return names
		
	def existName(self, name):
		for i in self.getnames():
			if i==name:
				return True
		return False
		
	def read(self, name):
		results = self.showresults()
		for i in results['rows']:
			docname = i['doc']['name']
			#print name
			
			if docname==name:
				docID = i["id"]
				doc = self.db[docID]
				
				# Grab it to test
				anatt = doc.attachment("waveform")
				#print("Downloading: waveform")
				r = anatt.get(stream=True)
				astr = ""
				for chunk in r.iter_content(chunk_size=1024):
					if chunk:
						astr += chunk 

				nparray = numpy.fromstring(astr, dtype=numpy.float64)
				
				#print "Data read", nparray
				return nparray
		return "Data not found"
		
	def deleteDocument(self, name):
		results = self.showresults()
		for i in results['rows']:
			docname = i['doc']['name']
			if docname == name:
				doc = self.db[i['id']]
				doc.delete(i['doc']['_rev'])
				#print("doc deleted")
		
	def readOutTotalVolts(self, name):
		results = self.showresults()
		totalVolts = None;
		for i in results['rows']:
			docname = i['doc']['name']
			#print name
			
			if docname==name:
				totalVolts = i['doc']['totalVolts']
				return totalVolts
		return False
	
	
	def readOutSamplingFreq(self, name):
		results = self.showresults()
		samplingFreq = None;
		for i in results['rows']:
			docname = i['doc']['name']
			#print name
			
			if docname==name:
				samplingFreq = i['doc']['samplingFreq']
				return samplingFreq
		return False
	
		
	def saveWF(self, name, b0, F_Burst_Time, Sampling_Freq, Sig, Measuring_Time, Length):
		if(self.existName(name)):
			raise Exception("Document not saved!: Document name already exists")
		nparray = makeArrayToSend(b0, F_Burst_Time, Sampling_Freq, Sig, Measuring_Time, Length)
		totalVolts = nparray[1]
		nparray = nparray[0]

		src = nparray.tostring()
		
		doc_to_post = {"type": "waveform", "name": name, "totalVolts" : totalVolts, "samplingFreq" : Sampling_Freq}
		
		res = self.db.design("nedm_default").post("_update/insert_with_timestamp", params = doc_to_post).json()
		if "ok" not in res:
			raise Exception("document not saved!: {}".format(json.dumps(res)))		
		
		doc = self.db[res["id"]]
		rev = doc.get().json()["_rev"]
		
		res = doc.attachment("waveform?rev="+rev).put(data = src, headers = {'content-type' : 'application/octet-stream'}).json()
		if "ok" not in res:
			raise Exception("attachment not saved!: {}".format(json.dumps(res)))
		
		print("Document saved: {}".format(json.dumps(res, indent=4)))
		return nparray


#dbtest.deleteDB()
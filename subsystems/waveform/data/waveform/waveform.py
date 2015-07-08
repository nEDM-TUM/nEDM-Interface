import socket
#import pynedm
import time
import math
import numpy
#import matplotlib.pyplot as plt
import sys
import ROOT

class SocketDaptisconnect(Exception):
    pass
 
class SocketObj:
    def __init__(self, address, port, term_character="\n"):
        s = socket.socket()
        s.connect((str(address), port))
        self.s = s
        self.tc = term_character
 
    def flush_buffer(self):
        astr = ""
        while 1:
            try:
                r = self.s.recv(4096)
                if not r: 
                    break
                astr += r
                if astr.find(self.tc) != -1: 
                    break
            except socket.error:
                raise SocketDisconnect("Disconnected from socket")

        return astr.replace(self.tc, "")
 
 
    def cmd_and_return(self, cmd, expected_return=True):
        self.s.send(cmd + "\n")
        if expected_return and cmd.find('?') != -1:
            return self.flush_buffer().rstrip()
        else:
            return ""

class AgilentException(Exception):
    pass

class AgilentWaveform(SocketObj):
    def check_errors(self, msg=""):
        x = eval(self.cmd_and_return("system:error?"))
        if x[0] != 0:
            raise AgilentException("System error: '%s', msg('%s')" % (x[1], msg))
    
    def close(self):
        self.cmd_and_return("outp off")
        return
    
    
    def send_wf(self, alist, aname, sample_rate=None, amplitude=None,offset=None):
        o = numpy.array(alist).astype(numpy.float32)
        if numpy.max(o) > 1 or numpy.min(o) < -1:
            raise AgilentException("Waveform values must be between -1 and 1")
        self.cmd_and_return("outp off")
        self.cmd_and_return("data:volatile:clear")
        self.cmd_and_return("form:bord swap")
        if sample_rate is not None:
            astr = "apply:arbitrary " + str(sample_rate)
            self.cmd_and_return(astr, False)
            self.check_errors("Apply arbitrary")
        
        d = str(o.data)
        alen = str(len(d))
        send_str = "data:arbitrary %s,#" % (aname) 
        send_str += str(len(alen)) + alen + d
        self.cmd_and_return(send_str, False)
        self.cmd_and_return("*WAI")
        self.check_errors("Load waveform")
        self.cmd_and_return("func:arbitrary \"%s\"" % aname)
        self.check_errors("Set waveform")
        self.cmd_and_return("*WAI")
        if amplitude is not None:
            self.cmd_and_return("sour:volt " + str(amplitude))
            self.check_errors("Amplitude")
        if offset is not None:
            self.cmd_and_return("sour:volt:offs " + str(offset))
            self.check_errors("Offset")

        self.cmd_and_return("*WAI")
        return
        print "Saving..."
        self.cmd_and_return("mmem:stor:data \"INT:\\%s.barb\"" % aname)
        self.check_errors("Save as file...")
        
def get_triangle_function(alen):
    triangle = numpy.array(range(alen/2), dtype=numpy.float64) 
    triangle /= triangle[-1]
    rev_triangle = triangle[::-1]
    return numpy.concatenate((triangle, rev_triangle)) 
   
def get_gauss_function(alen, width, mean, sampling_freq):
    # The width is the FWHM
    gauss = numpy.array(range(alen), dtype=numpy.float64) 
    gauss *= (1./sampling_freq)
    gauss -= mean
    gauss *= gauss
    sigma_sq = 0.5*(width/2.3548)**2 
    gauss *= (1./sigma_sq)
    some = numpy.exp(-gauss)
    return some
 

def make_array(**kwargs):
    """
      arguments:
    """
    sampling_freq = kwargs.get("sampling_freq", 100000)
    burst_freq = kwargs.get("burst_freq", 30)
    first_burst_time = kwargs.get("first_burst_time", 10.)
    burst_width = kwargs.get("burst_width", 1.)
    phase = kwargs.get("phase", 0)
    measuring_time = kwargs.get("measuring_time", 100)
    alen = kwargs.get("length", 16000000)
    ret_windows = kwargs.get("ret_windows", False)
    
    # each point has a time of 1/sampling_freqency
    # this means, we should have samp_point*burst_freq*2*pi/(sampling_frequency)

    x = numpy.array(range(alen), dtype=numpy.float64)
    coef = burst_freq*2*math.pi/sampling_freq
    sine_wave = None
    if phase == 0: 
        sine_wave = numpy.sin(x*coef)
    else:
        sine_wave = numpy.sin(x*coef + numpy.array([phase]*len(x), dtype=numpy.float64))

    gauss_1 = get_gauss_function(alen, burst_width, first_burst_time, sampling_freq)
    if measuring_time == 0:
        if not ret_windows:
            return gauss_1*sine_wave
        else:
            return sine_wave, gauss_1

    gauss_2 = get_gauss_function(alen, burst_width, first_burst_time+measuring_time, sampling_freq)

    # Now we must window it
    if not ret_windows:
        return sine_wave*(gauss_1+gauss_2)
    else:
        return sine_wave, gauss_1+gauss_2


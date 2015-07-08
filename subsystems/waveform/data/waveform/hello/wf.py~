import socket
#import pynedm
import time
import math
import numpy
#import matplotlib.pyplot as plt
import sys
import ROOT

from waveform import *

    
def makeArrayToSend(b0, F_Burst_Time, Sampling_Freq, Sig, Measuring_Time, Length):
	 
    b0_field_strength = b0 # muT

    gamma_xe = 11.77717 # 1/(muT*s)
    gamma_he = 32.4341  # 1/(muT*s)
    
    volt_per_muT = 2*17.29 # V_pp / muT
    
    he_freq = gamma_he*b0_field_strength 
    xe_freq = gamma_xe*b0_field_strength 

        
    f_burst_time = F_Burst_Time
    sampling_freq = Sampling_Freq
    
    my_arr = None
    i = 0
    list_of_wfs = []
    sig = Sig # s
    total_volts = 0
    measuring_time = Measuring_Time
    length=Length
    
    for f,gam in [(he_freq, gamma_he), (xe_freq, gamma_xe)]:
        n = int(f*f_burst_time)
        aphase = math.pi/2 - (f*f_burst_time - n)*2*math.pi 
        assert( aphase < 2*math.pi )
        an_arr = make_array(burst_width=sig, measuring_time=measuring_time, 
                            first_burst_time = f_burst_time, sampling_freq = sampling_freq, 
                            burst_freq=f, phase=aphase, length=length)
        
        amp = (1./gam)/(2*math.sqrt(2*math.pi)*sig) # (muT)
        amp *= volt_per_muT
        print("Amp.:", amp)
        if my_arr is not None:
            my_arr += amp*an_arr
        else:
            my_arr = amp*an_arr
        total_volts += amp 
    my_arr /= total_volts
    
    return [my_arr,total_volts]
    #return an_arr
    
def start():
	 return start_params(1.2, 0.5, 100000, 1, 2, 40000)
	
	
def startWithData(my_arr, total_volts, sampling_Freq = "100 kHz"):
    print("Send WF to device")
    so = AgilentWaveform("waveform.1.nedm1", 5025)
    
    setup_cmds = [
      ("*IDN?", None),# ID
      ("SYST:COMM:LAN:MAC?", None),# ID
    ]
    for c, f in setup_cmds:
        ret = so.cmd_and_return(c)
        print c, ret 
        if f:
            if f(ret): print "Pass"
            else: 
                print "Fail"
    print("Sending")
    so.send_wf(my_arr, "temp2", sampling_Freq, "%s Vpp" % str(total_volts), "0 V")
    print("Connection closed")
    #so.close()
    return my_arr
	
	
def start_params(b0, F_Burst_Time, Sampling_Freq, Sig, Measuring_Time, Length):
    print b0, F_Burst_Time,Sampling_Freq, Sig, Measuring_Time, Length
    arr = makeArrayToSend(b0, F_Burst_Time, Sampling_Freq, Sig, Measuring_Time, Length)
    my_arr = arr[0]
    total_volts = arr[1]
    
    samplingFreq = int(SamplingFreq / 1000) + " kHz"
    startWithData(my_arr, total_volts, samplingFreq)
    
    
    #raw_input("E")
    #########################
    # DRAWING THE PLOT
    #########################
    #dbl = ROOT.TDoubleWaveform(total_volts*my_arr, len(my_arr))
    #dbl.SetSamplingFreq(1e-4) # 100 kHz
    #wfft = ROOT.TWaveformFT()
    #ROOT.TFastFourierTransformFFTW.GetFFT(len(dbl)).PerformFFT(dbl, wfft)
    #c1 = ROOT.TCanvas()
    #ahist = wfft.GimmeHist()
    #ahist.GetXaxis().SetRangeUser(0, 2*he_freq*1e-6)
    #ahist.Draw()
    #c1.Update()
    #plt.plot(my_arr)
    #plt.show()
    #dbl.GimmeHist().Draw()
    #c = 1
    #for h in list_of_wfs:
    #    ah = h.GimmeHist(str(c))
    #    ah.SetLineColor(c)
    #    ah.Draw('same')
    #    c+= 1
    #c1.Update()   
    #raw_input("E")
    
    
if __name__ == "__main__":
	start()



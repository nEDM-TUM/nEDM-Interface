import subprocess
import re
from distutils.spawn import find_executable

if find_executable("jshint") is None:
    raise Exception("jshint couldn't be found, please install!")

class JSException(Exception):
    def __init__(self, msg):
        Exception.__init__(self, msg)

_re_comp = None
_context = 9
def output_line_column(err):
    global _re_comp
    if not _re_comp:
        _re_comp = re.compile("line ([0-9]+), col ([0-9]+)")
    l, c = _re_comp.search(err).groups()
    return int(l), int(c)

def check_string(astr, ignore_warnings=[]):
    pip = subprocess.PIPE
    p = subprocess.Popen(["jshint", "--verbose", "-"], stdin=pip, stdout=pip)
    warning_str = ""
    for aw in ignore_warnings:
        warning_str += "/* jshint -%s */\n" % aw
    subtract = len(ignore_warnings)
    out, _ = p.communicate(warning_str + astr)
    if p.returncode != 0:
        # parse the results
        all_lines = out.split('\n')
        astr_lines = astr.split('\n')
        amsg = ""
        for err in all_lines:
            if err[:6] != "stdin:": continue 
            l, c = output_line_column(err)
            pt_of_error = l-1-subtract
            amsg += "\n\n" + "\n".join(astr_lines[pt_of_error-_context:pt_of_error-1])
            amsg += "\n   %s\n  %s\n  %s\n" % ( astr_lines[pt_of_error], "-"*(c) + "^", err)
        raise JSException(amsg)

if __name__ == '__main__': 
    import sys
    import os 
    for f in sys.argv[1:]:
        if os.path.exists(f):
            f = open(f).read()
        check_string(f)

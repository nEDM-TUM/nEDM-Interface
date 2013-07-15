import sys
import getpass
import subprocess
import tempfile
import os
import glob
import shutil
try:
    import pexpect
except ImportError:
    print """
'pexpect' is required.  Try installing using, e.g.:

[sudo] easy_install pexpect
"""
    sys.exit(1)

try:
    import json
except ImportError:
    print """
'json' is required.  Try installing using, e.g.:

[sudo] easy_install json
"""
    sys.exit(1)


_have_tried = False
_username = None 
_password = None 

def set_username_pw(un, pw):
    global _username, _password
    _username = un
    _password = pw

def populate_username_pw():
    global _username, _password, _have_tried
    if _have_tried or _username is None: _username = getpass.getpass("Username: ")
    if _have_tried or _password is None: _password = getpass.getpass()
    return _username, _password

"""
execute_kanso calls the string and deals with any password/username entry.  It
will save the username and password for further calls to this function. 
"""
def execute_kanso(kanso_str):
    global _have_tried

    child = pexpect.spawn(kanso_str)

    try:
        while 1:
            child.expect(".*Username:")
            if _have_tried:
                print "Try password again"
           
            un, pw = populate_username_pw() 
            child.sendline(un)
            child.expect(["Password:"])
            child.sendline(pw)
            _have_tried = True
    except pexpect.EOF:
        # pexpect will throw a EOF if the program ends while expecting new
        # output.  This will happen, e.g., if no further username/password
        # entry is necessary.
        pass
    _have_tried = False
    child.close()
    if child.exitstatus != 0 or child.signalstatus is not None:
        print "Problem with: "
        print kanso_str 
        sys.exit(1)
 

"""
Updates the security, this has to be done delicately.

"""
def update_security(host, db_name, folder):


    un, pw = populate_username_pw()

    # We have to explicitly call the server, with un, and pw if it's not yet there... 
    db_path = "http://%s:%s@%s/%s" % (un, pw, host, db_name)

    default_security_doc = json.load(open("_default/_security.json"))

    # Search to see if there's a _security document to upload 
    folder_sec_path = os.path.join(folder, "_security.json")
    if os.path.exists(folder_sec_path):
        sec_doc = json.load(open(folder_sec_path))
        for n in ["admins", "members"]:
            for o in ["names", "roles"]:
                try:
                    for itm in sec_doc[n][o]:
                        if itm not in default_security_doc[n][o]:
                            default_security_doc[n][o].append(itm)

                except KeyError:
                    pass

    default_security_doc["_id"] = "_security"

    o = tempfile.NamedTemporaryFile()
    json.dump(default_security_doc, o)
    o.flush()

    execute_kanso("kanso upload " + o.name + " " + db_path) 

        
"""
push to a particular database given a certain folder

"""
def push_database(host, db_name, folder):

    # push defaults

    db_path = "http://" + host + "/" + db_name
    execute_kanso("kanso push _default " +  db_path) 

"""
upload data 

"""
def upload_data(host, db_name, folder):

    # push defaults

    un, pw = populate_username_pw()

    # We have to explicitly call the server, with un, and pw if it's not yet there... 
    db_path = "http://%s:%s@%s/%s" % (un, pw, host, db_name)

    # Unfortunately, due to a limitation in the kanso upload command, we need
    # to preprocess the files to remove new-lines

    # copy to temp directory
    tempd = tempfile.mkdtemp()

    for af in glob.iglob(db_name + "/*"):
        base_n = os.path.basename(af)
        with open(af) as f: astr = f.read()
        astr = astr.replace("\n", "\\n").replace("\r", "\\n")
        with open(os.path.join(tempd, base_n), "w") as f: f.write(astr)

    execute_kanso(" ".join(["kanso upload", "-f", tempd, db_path]))

    # remove temp directory
    shutil.rmtree(tempd)

       

"""
push to a given server, the databases will be automatically collected from the
current folders.
"""
def main(server = None):

    if server is None:
        server = "localhost:5984"

    if os.path.exists(".nedmrc"):
        try:
            obj = json.load(open(".nedmrc"))
            if "server" in obj: server = obj["server"]
            try:
                set_username_pw(obj["username"], obj["password"])
            except KeyError: pass
        except ValueError:
            print ".nedmrc found, but not formatted properly.  Ignoring..."
            pass

    dbnames = [db for db in glob.glob("subsystems/*") if os.path.isdir(db)] 

    
    for db_path in dbnames:
        print "Pushing to: ", db_path
        db_name = "nedm%2F" + os.path.basename(db_path)
        push_database(server, db_name, db_path)
        update_security(server, db_name, db_path) 
        data_dir = os.path.join(db_path, "data")
        if os.path.isdir(data_dir): 
            upload_data(server, db_name, data_dir) 

    # Handle head specially
    for db_path in ["head"]:
        print "Pushing to: ", db_path
        db_name = "nedm%2F" + os.path.basename(db_path)
        push_database(server, db_name, db_path)
        server_path = "http://" + server + "/" + db_name
        execute_kanso("kanso push " + db_path  + " " + server_path)
        data_dir = os.path.join(db_path, "data")
        if os.path.isdir(data_dir): 
            upload_data(server, db_name, data_dir) 



if __name__ == '__main__':
    serv = None
    if len(sys.argv) > 1:
        serv = sys.argv[1]

    main(serv)

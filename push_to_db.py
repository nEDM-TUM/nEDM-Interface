import sys
import getpass
import subprocess
import os
import glob
try:
    import pexpect
    import json
    import yaml
    import cloudant
except ImportError, e:
    msg = e.message
    msg += """

Above referenced module is required.  Try installing using, e.g.:

[sudo] easy_install [module_name]
"""
    e.args = (msg,)
    raise 

class KansoException(Exception):
    pass


_have_tried = False
_username = None 
_password = None 

_acct = None

_pending_requests = []

def set_username_pw(un, pw):
    global _username, _password
    _username = un
    _password = pw

def populate_username_pw():
    global _username, _password, _have_tried
    if _have_tried or _username is None: _username = getpass.getpass("Username: ")
    if _have_tried or _password is None: _password = getpass.getpass()
    return _username, _password

def get_current_account(host=""):
    global _acct
    if _acct: return _acct
    un, pw = populate_username_pw()
    _acct = cloudant.Account(uri="http://%s" % host, async=True)
    res = _acct.login(un, pw)
    login = res.result()
    if login.status_code != 200:
        print "UN/Password incorrect"
        _acct = None
    return get_current_account(host)

def compare_documents(ondb, topush):
    ok_differences = set(["timestamp", "created_by", "_rev"])
    ondb_s = set(ondb.keys())
    topush_s = set(topush.keys())
    diffs = ondb_s.symmetric_difference(topush_s)
    if len(diffs.symmetric_difference(ok_differences)) > 0: return False
     
    for k in topush:
        if ondb[k] != topush[k]: 
            return False
    return True

"""
execute_kanso calls the string and deals with any password/username entry.  It
will save the username and password for further calls to this function. 
"""
def execute_kanso(kanso_str):
    global _have_tried

    child = pexpect.spawn(kanso_str,timeout=60)

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
        raise KansoException 
 

"""
Updates the security, this has to be done delicately.

"""
def update_security(host, db_name, folder):
    global _pending_requests

    db = get_current_account(host)[db_name] 

    # We have to explicitly call the server, with un, and pw if it's not yet there... 

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

    doc = db.document('_security')
    resp = doc.put(params=default_security_doc)
    _pending_requests.append(resp)
    
       
        
"""
push to a particular database given a certain folder

"""
def push_database(host, db_name, folder="_default"):

    # push defaults

    db_path = "http://" + host + "/" + db_name
    execute_kanso("kanso push %s %s " % (folder, db_path)) 

"""
upload data 

"""
def upload_data(host, db_name, folder):

    global _pending_requests
    # push defaults

    acct = get_current_account(host) 

    # We have to explicitly call the server, with un, and pw if it's not yet there... 

    # Unfortunately, due to a limitation in the kanso upload command, we need
    # to preprocess the files to remove new-lines
    db = acct[db_name]

    bulk_docs = [] 
    for af in glob.iglob(folder + "/*.json"):
        base_n = os.path.basename(af)
        with open(af) as f: 
            astr = '\n'.join([x for x in f.readlines() if x[0] != '#'])

        bulk_docs.append(yaml.load(astr))

    # We need to deal with possible conflicts
    # Here we grab the rev number from current documents

    all_docs = db.all_docs(params=dict(include_docs=True,
                                       keys=[adoc["_id"] for adoc in bulk_docs if "_id" in adoc]))
    all_docs = dict([(d["key"], d["doc"]) for d in all_docs if "doc" in d and d["doc"] is not None])
    ids = all_docs.keys()

    def get_design(ades):
        ds_name = "_design/" + ades
        ad = [d for d in db.all_docs(params=dict(keys=[ds_name]))][0]
        if "error" in ad or "deleted" in ad["value"]:
            print "   Inserting: ", ds_name
            bds = dict([(d["_id"], d) for d in bulk_docs if "_id" in d])
            pd = bds[ds_name].copy()
            try:
                pd["_rev"] = ad['value']['rev']
            except KeyError: pass
            json = db.post(params=pd).result().json()
            if "ok" not in json:
                print json
                raise KansoException
            bulk_docs.remove(bds[ds_name])
        return db.design(ades)

    des = get_design("nedm_default")
    for adoc in bulk_docs:
        func_name = "_update/insert_with_timestamp"
        func = des.post
        if "_id" in adoc and adoc["_id"] in ids:
            # We need to use the update handler with name 
            theid = adoc["_id"]
            func_name += "/%s" % theid 
            func = des.put
            if theid in all_docs and compare_documents(all_docs[theid], adoc):
                 continue 
            print "    Updating: ", adoc['_id'] 
        resp = func(func_name, params=adoc)
        _pending_requests.append(resp)

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
        print "    Update sec/data"
        update_security(server, db_name, db_path) 
        upload_data(server, db_name, "_default_data") 

        data_dir = os.path.join(db_path, "data")
        if os.path.isdir(data_dir): 
            upload_data(server, db_name, data_dir) 

    # Handle head specially
    for db_path in ["head"]:
        print "Pushing to: ", db_path
        db_name = "nedm_" + os.path.basename(db_path)
        push_database(server, db_name, db_path)
        server_path = "http://" + server + "/" + db_name
        data_dir = os.path.join(db_path, "data")
        if os.path.isdir(data_dir): 
            upload_data(server, db_name, data_dir) 

    for rqst in _pending_requests:
        response = rqst.result().json()
        if type(response) != type([]):
            response = [response]
        for a in response: 
            if "ok" not in a or not a["ok"]: print "Not ok", a 

if __name__ == '__main__':
    serv = None
    if len(sys.argv) > 1:
        serv = sys.argv[1]

    main(serv)

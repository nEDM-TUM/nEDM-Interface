// Global variables, to be exported and used by user code
$ = require("jquery");
require("jquery-cookie");
$.cookie.json = true;
var ace = require("ace");
ace.config.set("basePath", "/nedm_head/_design/nedm_head/ace/");
var jqm_cal = require("jqm-calendar");
var nedm = require("lib/nedm"); 

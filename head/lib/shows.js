exports.page = function(doc, req) {
  var handlebars = require('handlebars');
  new_query = {}
  for (var k in req.query) {
    new_query[k] = encodeURIComponent(req.query[k]);
  }
  html = handlebars.compile("<html class='ui-mobile'><head><meta http-equiv='Content-Type' content='text/html; charset=UTF-8'><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'><title>nEDM Base</title> <link rel='stylesheet' href='/nedm_head/_design/nedm_head/style/jquery.mobile-1.4.0-pre.css' /><script src='/nedm_head/_design/nedm_head/modules.js'></script><script src='/nedm_head/_design/nedm_head/scripts/nedm-base.js'></script><style> .center { text-align: center; } </style>{{{header}}}</head>")(doc);

  var new_obj = {};
  for (var i in doc) {
    if (typeof(doc[i]) != 'string') continue; 
    if (i != "script") {
      new_obj[i] = handlebars.compile(doc[i])(new_query);
    } else { 
      new_obj[i] = doc[i];
    }
  }
  log(new_obj);
  html += "<body class='ui-mobile-viewport ui-overlay-c'>";
  html += handlebars.compile(doc.body)(new_obj);
  html += "</body></html>";
  return html; 
};
